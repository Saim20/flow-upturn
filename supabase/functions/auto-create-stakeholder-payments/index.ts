import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

/**
 * Edge Function: Auto-Create Stakeholder Payments
 * 
 * This function runs on a schedule (e.g., daily) to automatically create
 * payment records for recurring incoming services.
 * 
 * For each active incoming service with auto_create_payment = true:
 * 1. Check if next_billing_date is today or in the past
 * 2. Create a payment record for the billing period
 * 3. Update the service's last_billed_date and next_billing_date
 */

interface BillingService {
  id: number;
  company_id: number;
  stakeholder_id: number;
  service_name: string;
  billing_cycle_type: string;
  billing_day_of_month?: number;
  billing_day_of_week?: number;
  billing_month_of_year?: number;
  billing_interval_days?: number;
  last_billed_date?: string;
  next_billing_date?: string;
  start_date: string;
  currency: string;
  tax_rate: number;
  stakeholder: {
    name: string;
    address?: string;
    contact_persons?: unknown;
  };
  line_items: Array<{
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    item_order: number;
  }>;
}

interface PaymentLineItem {
  payment_id: number;
  item_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

/**
 * Calculate the next billing date based on the billing cycle
 */
function calculateNextBillingDate(
  service: BillingService,
  fromDate: Date
): Date {
  const nextDate = new Date(fromDate);
  
  switch (service.billing_cycle_type) {
    case "monthly":
      // Move to next month, same day
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (service.billing_day_of_month) {
        // Handle month end (e.g., billing day 31 in February)
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        nextDate.setDate(Math.min(service.billing_day_of_month, lastDayOfMonth));
      }
      break;
      
    case "weekly":
      // Move to next week, same day
      nextDate.setDate(nextDate.getDate() + 7);
      break;
      
    case "yearly":
      // Move to next year
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (service.billing_month_of_year && service.billing_day_of_month) {
        nextDate.setMonth(service.billing_month_of_year - 1);
        nextDate.setDate(service.billing_day_of_month);
      }
      break;
      
    case "x_days":
      // Add X days
      if (service.billing_interval_days) {
        nextDate.setDate(nextDate.getDate() + service.billing_interval_days);
      }
      break;
      
    default:
      // Default to monthly
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
}

/**
 * Calculate billing period based on billing cycle
 */
function calculateBillingPeriod(
  service: BillingService,
  billingDate: Date
): { start: Date; end: Date } {
  const end = new Date(billingDate);
  const start = new Date(billingDate);
  
  switch (service.billing_cycle_type) {
    case "monthly":
      // Period is from billing day of previous month to billing day of current month
      start.setMonth(start.getMonth() - 1);
      break;
      
    case "weekly":
      // Period is 7 days
      start.setDate(start.getDate() - 7);
      break;
      
    case "yearly":
      // Period is 1 year
      start.setFullYear(start.getFullYear() - 1);
      break;
      
    case "x_days":
      // Period is X days
      if (service.billing_interval_days) {
        start.setDate(start.getDate() - service.billing_interval_days);
      }
      break;
      
    default:
      start.setMonth(start.getMonth() - 1);
  }
  
  // Adjust to not go before service start date
  const serviceStart = new Date(service.start_date);
  if (start < serviceStart) {
    start.setTime(serviceStart.getTime());
  }
  
  return { start, end };
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

serve(async (req: Request) => {
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = formatDateISO(today);

    console.log(`[auto-create-stakeholder-payments] Starting run for ${todayISO}`);

    // Fetch all active incoming services with auto_create_payment enabled
    // that have next_billing_date <= today
    const { data: services, error: servicesError } = await supabase
      .from("stakeholder_services")
      .select(`
        id,
        company_id,
        stakeholder_id,
        service_name,
        billing_cycle_type,
        billing_day_of_month,
        billing_day_of_week,
        billing_month_of_year,
        billing_interval_days,
        last_billed_date,
        next_billing_date,
        start_date,
        currency,
        tax_rate,
        stakeholder:stakeholders!inner(
          name,
          address,
          contact_persons
        ),
        line_items:stakeholder_service_line_items(
          id,
          description,
          quantity,
          unit_price,
          amount,
          item_order
        )
      `)
      .eq("direction", "incoming")
      .eq("service_type", "recurring")
      .eq("status", "active")
      .eq("auto_create_payment", true)
      .lte("next_billing_date", todayISO);

    if (servicesError) {
      throw servicesError;
    }

    console.log(`[auto-create-stakeholder-payments] Found ${services?.length || 0} services due for billing`);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({
          status: "success",
          message: "No services due for billing",
          results,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Process each service
    for (const service of services as unknown as BillingService[]) {
      results.processed++;
      
      try {
        // Get stakeholder data (handle single object from join)
        const stakeholder = Array.isArray(service.stakeholder) 
          ? service.stakeholder[0] 
          : service.stakeholder;
          
        if (!stakeholder) {
          console.log(`[auto-create-stakeholder-payments] Service ${service.id}: No stakeholder found, skipping`);
          results.skipped++;
          continue;
        }

        // Validate line items exist
        if (!service.line_items || service.line_items.length === 0) {
          console.log(`[auto-create-stakeholder-payments] Service ${service.id}: No line items, skipping`);
          results.skipped++;
          continue;
        }

        const billingDate = service.next_billing_date 
          ? new Date(service.next_billing_date) 
          : today;
        const { start: periodStart, end: periodEnd } = calculateBillingPeriod(service, billingDate);

        // Check if payment already exists for this period
        const { data: existingPayments, error: checkError } = await supabase
          .from("stakeholder_service_payments")
          .select("id")
          .eq("service_id", service.id)
          .eq("billing_period_start", formatDateISO(periodStart))
          .eq("billing_period_end", formatDateISO(periodEnd));

        if (checkError) {
          throw checkError;
        }

        if (existingPayments && existingPayments.length > 0) {
          console.log(`[auto-create-stakeholder-payments] Service ${service.id}: Payment already exists for period, skipping`);
          results.skipped++;
          
          // Still update next billing date to avoid infinite loop
          const nextBillingDate = calculateNextBillingDate(service, billingDate);
          await supabase
            .from("stakeholder_services")
            .update({
              next_billing_date: formatDateISO(nextBillingDate),
              updated_at: new Date().toISOString(),
            })
            .eq("id", service.id);
          
          continue;
        }

        // Calculate totals from line items
        const subtotal = service.line_items.reduce(
          (sum, item) => sum + item.amount,
          0
        );
        const taxAmount = subtotal * (service.tax_rate / 100);
        const totalAmount = subtotal + taxAmount;

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
          .from("stakeholder_service_payments")
          .insert({
            service_id: service.id,
            company_id: service.company_id,
            stakeholder_id: service.stakeholder_id,
            billing_period_start: formatDateISO(periodStart),
            billing_period_end: formatDateISO(periodEnd),
            currency: service.currency,
            subtotal,
            tax_rate: service.tax_rate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: "pending",
            vendor_snapshot: {
              name: stakeholder.name,
              address: stakeholder.address,
              contact_persons: stakeholder.contact_persons,
            },
            notes: `Auto-generated payment for ${service.service_name}`,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (paymentError) {
          throw paymentError;
        }

        // Create payment line items
        const lineItems: PaymentLineItem[] = service.line_items.map((item) => ({
          payment_id: payment.id,
          item_order: item.item_order,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        }));

        const { error: lineItemsError } = await supabase
          .from("stakeholder_payment_line_items")
          .insert(lineItems);

        if (lineItemsError) {
          console.error(`[auto-create-stakeholder-payments] Service ${service.id}: Failed to create line items:`, lineItemsError);
          // Payment was created, but line items failed - log but don't throw
        }

        // Update service with new billing dates
        const nextBillingDate = calculateNextBillingDate(service, billingDate);
        const { error: updateError } = await supabase
          .from("stakeholder_services")
          .update({
            last_billed_date: formatDateISO(billingDate),
            next_billing_date: formatDateISO(nextBillingDate),
            updated_at: new Date().toISOString(),
          })
          .eq("id", service.id);

        if (updateError) {
          console.error(`[auto-create-stakeholder-payments] Service ${service.id}: Failed to update billing dates:`, updateError);
        }

        console.log(`[auto-create-stakeholder-payments] Service ${service.id}: Payment ${payment.id} created successfully`);
        results.created++;

      } catch (serviceErr) {
        const message = serviceErr instanceof Error ? serviceErr.message : "Unknown error";
        console.error(`[auto-create-stakeholder-payments] Service ${service.id}: Error - ${message}`);
        results.errors.push(`Service ${service.id}: ${message}`);
      }
    }

    console.log(`[auto-create-stakeholder-payments] Completed: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        status: "success",
        message: `Processed ${results.processed} services`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[auto-create-stakeholder-payments] Fatal error:", err);
    return new Response(
      JSON.stringify({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
