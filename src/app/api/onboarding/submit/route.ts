import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/onboarding/submit
 * 
 * Submits onboarding data for a new employee.
 * Uses admin client to bypass RLS for company settings check.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      first_name,
      last_name,
      email,
      phone_number,
      designation,
      department_id,
      job_status,
      hire_date,
      company_id,
      supervisor_id,
      // Device information for automatic approval during onboarding
      device_id,
      device_info,
      device_browser,
      device_os,
      device_type,
      device_model,
      device_user_agent,
      device_location
    } = body

    // Validate required fields
    if (!first_name || !last_name || !email || !company_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get authenticated user from the regular client
    const userSupabase = await createClient()
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use admin client to bypass RLS for the following operations
    let adminSupabase;
    try {
      adminSupabase = createAdminClient()
    } catch (err) {
      console.error('Admin client creation failed:', err)
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Check if email already exists for a different user
    const { data: existingEmployee, error: checkError } = await adminSupabase
      .from('employees')
      .select('id, email')
      .eq('email', email)
      .neq('id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('Email check error:', checkError)
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      )
    }

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'This email is already associated with another employee account. Please use a different email address.' },
        { status: 400 }
      )
    }

    // Check max_users limit
    const { data: companyData, error: companyError } = await adminSupabase
      .from('companies')
      .select('max_users')
      .eq('id', company_id)
      .single()

    if (companyError) {
      console.error('Company fetch error:', companyError)
      return NextResponse.json(
        { error: 'Failed to fetch company settings' },
        { status: 500 }
      )
    }

    // Count current active employees
    const { count: currentEmployeeCount, error: countError } = await adminSupabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('job_status', 'Active')

    if (countError) {
      console.error('Employee count error:', countError)
      return NextResponse.json(
        { error: 'Failed to count employees' },
        { status: 500 }
      )
    }

    if (companyData.max_users && (currentEmployeeCount || 0) >= companyData.max_users) {
      return NextResponse.json(
        { error: `Company has reached its maximum user limit of ${companyData.max_users}. Please contact support or upgrade your plan.` },
        { status: 400 }
      )
    }

    // Generate ID input
    const generateIdInput = () => {
      const letters = Array(3)
        .fill(null)
        .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
        .join('')
      const digits = String(Math.floor(1000 + Math.random() * 9000))
      return letters + digits
    }

    // Check if this is the first employee in the company (auto-approve first employee)
    const { count: existingEmployeeCount, error: firstCheckError } = await adminSupabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company_id)

    if (firstCheckError) {
      console.error('First employee check error:', firstCheckError)
    }

    const isFirstEmployee = (existingEmployeeCount || 0) === 0
    const approvalStatus = isFirstEmployee ? 'ACCEPTED' : 'PENDING'
    const employeeRole = isFirstEmployee ? 'Admin' : 'Employee'

    // Insert/update employee record
    const { error: upsertError } = await adminSupabase
      .from('employees')
      .upsert([
        {
          id: user.id,
          first_name,
          last_name,
          email,
          phone_number,
          designation,
          department_id,
          job_status,
          role: employeeRole,
          is_supervisor: false,
          hire_date,
          company_id,
          rejection_reason: null,
          has_approval: approvalStatus,
          id_input: generateIdInput(),
          supervisor_id: supervisor_id || null,
        },
      ])

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      )
    }

    // Log first employee auto-approval and add to Administrators team
    if (isFirstEmployee) {
      console.log(`✅ First employee ${email} auto-approved as Admin for company ${company_id}`)

      // Explicitly add first employee to Administrators team
      const { data: adminTeam } = await adminSupabase
        .from('teams')
        .select('id')
        .eq('company_id', company_id)
        .eq('name', 'Administrators')
        .eq('is_default', true)
        .single()

      if (adminTeam) {
        const { error: teamMemberError } = await adminSupabase
          .from('team_members')
          .upsert({
            team_id: adminTeam.id,
            employee_id: user.id,
            added_by: user.id
          }, { onConflict: 'team_id,employee_id' })

        if (teamMemberError) {
          console.error('Error adding first employee to Administrators team:', teamMemberError)
        } else {
          console.log(`✅ First employee added to Administrators team (ID: ${adminTeam.id})`)
        }
      } else {
        console.warn('⚠️ Administrators team not found for company', company_id)
      }
    }

    // Register device as pending for approval along with the onboarding request
    if (device_id) {
      // Check if device already exists
      const { data: existingDevice } = await adminSupabase
        .from('user_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_id', device_id)
        .maybeSingle()

      if (!existingDevice) {
        // Register new device - auto-approved for first employee, pending for others
        const deviceStatus = isFirstEmployee ? 'approved' : 'pending'
        const { error: deviceError } = await adminSupabase
          .from('user_devices')
          .insert({
            user_id: user.id,
            device_id,
            device_info: device_info || 'Unknown Device',
            status: deviceStatus,
            browser: device_browser,
            os: device_os,
            device_type,
            model: device_model,
            user_agent: device_user_agent,
            location: device_location
          })

        if (deviceError) {
          console.error('Device registration error:', deviceError)
          // Don't fail the onboarding if device registration fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Employee data submitted successfully.',
    })
  } catch (error) {
    console.error('Error submitting onboarding:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
