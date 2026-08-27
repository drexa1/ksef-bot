use inquire::DateSelect;
use chrono::{DateTime, Utc};
use std::env::var;

pub fn list_sales_invoices() -> anyhow::Result<()> {
    println!("Fetching invoices...");
    println!("  [API] GET /invoices");
    println!("  [API] Response: 3 invoices found.");
    println!();
    println!("  1. FV/2026/001 - ACME Sp. z o.o. - 1,230.00 PLN");
    println!("  2. FV/2026/002 - Example Ltd.    - 2,450.00 PLN");
    println!("  3. FV/2026/003 - Test Company    -   850.00 PLN");
    Ok(())
}

pub async fn list_purchase_invoices() -> anyhow::Result<()> {
    let from: DateTime<Utc> = DateSelect::new("From date:").prompt()?.and_hms_opt(0, 0, 0).unwrap().and_utc();
    let to: DateTime<Utc> = DateSelect::new("To date:").prompt()?.and_hms_opt(23, 59, 59).unwrap().and_utc();
    let response = reqwest::Client::new()
        .get(format!("{}/ksef/purchases", var("CF_WORKER_URL")?))
        .query(&[("from", from.format("%Y/%m/%d").to_string()), ("to", to.format("%Y/%m/%d").to_string())])
        .header("CF-Access-Client-Id", var("CF_ACCESS_CLIENT_ID")?)
        .header("CF-Access-Client-Secret", var("CF_ACCESS_CLIENT_SECRET")?)
        .header("X-API-Key", var("APP_API_KEY")?)
        .header("X-User-Id", var("APP_USER_ID")?)
        .header("Content-Type", "application/json")
        .send()
        .await?;

    println!("Status: {}", response.status());
    println!("Headers: {:#?}", response.headers());
    let body = response.text().await?;
    println!("Body:\n{}", body);

    Ok(())
}

pub fn create_sales_invoice() -> anyhow::Result<()> {
    println!("Step 1/5: Loading customers...");
    println!("  [API] GET /customers");
    println!("  [API] 3 customers available.");
    println!();
    println!("Step 2/5: Selecting customer...");
    println!("  Customer: ACME Sp. z o.o.");
    println!("  NIP: 1234567890");
    println!();
    println!("Step 3/5: Adding invoice items...");
    println!("  Item: Software development");
    println!("  Quantity: 1");
    println!("  Net price: 1,000.00 PLN");
    println!();
    println!("Step 4/5: Calculating VAT...");
    println!("  VAT rate: 23%");
    println!("  VAT: 230.00 PLN");
    println!("  Gross total: 1,230.00 PLN");
    println!();
    println!("Step 5/5: Creating invoice...");
    println!("  [API] POST /invoices");
    println!("  [API] Invoice created.");
    println!("  Invoice number: FV/2026/004");
    println!();
    println!("Sending invoice to KSeF...");
    println!("  [KSeF] Submitting invoice...");
    println!("  [KSeF] Invoice accepted.");
    println!("  KSeF reference: 2026-ABC-123456");
    Ok(())
}