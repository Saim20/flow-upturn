import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch all companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id");
    if (companiesError) throw companiesError;

    for (const company of companies) {
      const companyId = company.id;

      // 2. Fetch leave types of this company
      const { data: leaveTypes, error: leaveTypesError } = await supabase
        .from("leave_types")
        .select("id, annual_quota, max_carryover")
        .eq("company_id", companyId);
      if (leaveTypesError) throw leaveTypesError;

      // 3. Fetch all active employees of this company (exclude offboarded)
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", companyId)
        .in("job_status", ['Active', 'Probation']);
      if (employeesError) throw employeesError;

      // 4. Loop through each employee and leave type
      for (const employee of employees) {
        for (const leaveType of leaveTypes) {
          // Fetch current leave balance
          const { data: currentBalanceData, error: balanceError } =
            await supabase
              .from("leave_balances")
              .select("id, balance")
              .eq("employee_id", employee.id)
              .eq("company_id", companyId)
              .eq("type_id", leaveType.id)
              .single();

          if (balanceError && balanceError.code !== "PGRST116") {
            // PGRST116 = no rows found, which is fine
            throw balanceError;
          }

          const prevBalance = currentBalanceData?.balance || 0;
          const carryOver = leaveType.max_carryover || 0;

          const newBalance = leaveType.annual_quota + Math.min(prevBalance, carryOver);

          if (currentBalanceData) {
            // Update existing leave balance
            const { error: updateError } = await supabase
              .from("leave_balances")
              .update({ balance: newBalance })
              .eq("id", currentBalanceData.id);
            if (updateError) throw updateError;
          } else {
            // Insert new leave balance
            const { error: insertError } = await supabase
              .from("leave_balances")
              .insert({
                employee_id: employee.id,
                company_id: companyId,
                type_id: leaveType.id,
                balance: newBalance,
              });
            if (insertError) throw insertError;
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ status: "error", error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
