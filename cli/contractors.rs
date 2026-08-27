use inquire::{Text};

pub fn list_customers() -> anyhow::Result<()> {
    println!("Fetching customers...");
    println!("  [API] GET /customers");
    println!("  [API] Response: 3 customers found.");
    println!();
    println!("  1. ACME Sp. z o.o.");
    println!("     NIP: 1234567890");
    println!("     Email: billing@acme.example");
    println!();
    println!("  2. Example Ltd.");
    println!("     NIP: 9876543210");
    println!("     Email: invoices@example.com");
    println!();
    println!("  3. Test Company");
    println!("     NIP: 5555555555");
    println!("     Email: finance@test.example");
    Ok(())
}

pub fn create_customer() -> anyhow::Result<()> {
    let name = Text::new("Customer name").with_placeholder("ACME Sp. z o.o.").prompt()?;
    let nip = Text::new("NIP").with_placeholder("1234567890").prompt()?;
    let email = Text::new("Email").with_placeholder("billing@example.com").prompt()?;
    println!();
    println!("  API Customer created successfully.");
    println!("  Customer ID: dummy_001");
    let _ = (name, nip, email);
    Ok(())
}