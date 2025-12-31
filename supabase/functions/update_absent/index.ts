/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: any) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // needs service role for updates
  );

  let count = 1;

  const today = new Date().toLocaleDateString('sv-SE'); // yyyy-mm-dd


  // 1. Get companies with liveAbsent = true
  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id")
    .eq("live_absent_enabled", true);

  if (compErr) {
    console.error("Error fetching companies:", compErr);
    return new Response("Error fetching companies", { status: 500 });
  }

  for (const company of companies || []) {
    // 2. Get active employees of the company (exclude offboarded)
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, supervisor_id")
      .eq("company_id", company.id)
      .in("job_status", ['Active', 'Probation']);

    if (empErr) {
      console.error(`Error fetching employees for company ${company.id}:`, empErr);
      continue;
    }

    for (const emp of employees || []) {
      // 3. Check if employee has attendance record for today
      const { data: record, error: recErr } = await supabase
        .from("attendance_records")
        .select("id, check_in_time")
        .eq("employee_id", emp.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (recErr) {
        console.error(`Error checking attendance for employee ${emp.id}:`, recErr);
        continue;
      }

      let absent = true;
      const today_day = new Date().getDay();

      const { data: weeklyHolidays, error: whErr } = await supabase
        .from("weekly_holiday_configs")
        .select("day")
        .eq("company_id", company.id);

      if (whErr) {
        console.error(`Error fetching weekly holidays for company ${company.id}:`, whErr);
      }

      if (weeklyHolidays && weeklyHolidays.some((h: any) => h.day === today_day)) {
        count++;
        absent = false;
      }

      const { data: otherHolidays, error: ohErr } = await supabase
        .from("other_holiday_configs")
        .select("id")
        .eq("company_id", company.id)
        .lte("start_day", today)
        .gte("end_day", today);
      if (ohErr) {
        console.error(`Error fetching other holidays for company ${company.id}:`, ohErr);
      }

      if (otherHolidays && otherHolidays.length > 0) {
        absent = false;
      }


      const { data: leaveRecords, error: leaveErr } = await supabase
        .from("leave_records")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("status", "Accepted")
        .lte("start_date", today) // leave start_date <= today
        .gte("end_date", today);  // leave end_date >= today

      if (leaveErr) {
        console.error(`Error checking leave for employee ${emp.id}:`, leaveErr);
      }

      const attendanceData = {
        employee_id: emp.id,
        attendance_date: today,
        company_id: company.id,
        site_id: null,
        check_in_time: null,
        check_out_time: null,
        supervisor_id: emp.supervisor_id,
        check_in_coordinates: null,
        check_out_coordinates: null,
      }

      if ((leaveRecords && leaveRecords.length > 0)) {
        // Skip marking absent if employee is on leave or it's Friday/Saturday
        absent = false;
        const { data: insertData, error: insertErr } = await supabase
          .from("attendance_records")
          .insert({
            ...attendanceData,
            tag: "On_Leave",
          })

        if (insertErr) {
          console.error(`Insert/upsert failed for employee ${emp.id}:`, insertErr);
        } else {
          console.log("Record inserted:", insertData);
        }
      }




      // If no record OR record exists but no check_in_time → mark absent
      if (absent && (!record || !record.check_in_time)) {
        count++;
        const { data: insertData, error: insertErr } = await supabase
          .from("attendance_records")
          .insert({
            ...attendanceData,
            tag: "Absent", 
          })

        if (insertErr) {
          console.error(`Insert/upsert failed for employee ${emp.id}:`, insertErr);
        } else {
          console.log("Record inserted:", insertData);
        }


      }
    }
  }

  return new Response(`Absent marking completed for ${count} employees`, { status: 200 });
});
