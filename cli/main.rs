use anyhow::Result;
use inquire::{Select, Text};
use strum::{Display, EnumIter, IntoEnumIterator};
use crossterm::{
    cursor::MoveTo,
    execute,
    terminal::{Clear, ClearType},
};
use std::io::{self};

mod auth;
mod invoices;
mod contractors;
mod settings;

#[derive(Clone, Display, EnumIter)]
enum MainMenuAction {
    #[strum(to_string = "1. Create new [sales] invoice")] CreateSalesInvoice,
    #[strum(to_string = "2. List [sales] invoices")] ListSalesInvoices,
    #[strum(to_string = "3. List [purchase] invoices")] ListPurchaseInvoices,
    #[strum(to_string = "4. Create new contractor")] CreateContractor,
    #[strum(to_string = "5. List known contractors")] ListContractors,
    #[strum(to_string = "6. User settings")] UserSettings
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    auth::login_loop()?;
    main_loop().await?;
    Ok(())
}

// -------------------------------------------------------------------------------------------------
// Main loop
// -------------------------------------------------------------------------------------------------
async fn main_loop() -> Result<()> {
    loop {
        let action = Select::new("What shall we do now?", MainMenuAction::iter().collect()).prompt()?;
        match action {
            MainMenuAction::CreateSalesInvoice => invoices::create_sales_invoice()?,
            MainMenuAction::ListSalesInvoices => invoices::list_sales_invoices()?,
            MainMenuAction::ListPurchaseInvoices => invoices::list_purchase_invoices().await?,
            MainMenuAction::CreateContractor => contractors::create_customer()?,
            MainMenuAction::ListContractors => contractors::list_customers()?,
            MainMenuAction::UserSettings => settings::edit_profile()?
        }
        pause()?
    }
}

fn pause() -> Result<()> {
    println!();
    Text::new("Press [Enter] to go back to the main menu...").prompt()?;
    execute!(io::stdout(), Clear(ClearType::All), MoveTo(0, 0))?;
    Ok(())
}

