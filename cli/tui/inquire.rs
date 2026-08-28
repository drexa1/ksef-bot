use crate::{MainMenuAction, contractors, invoices, settings};
use anyhow::Result;
use crossterm::{
    cursor::MoveTo,
    execute,
    terminal::{Clear, ClearType},
};
use inquire::{Select, Text};
use std::io::{self};
use strum::IntoEnumIterator;

pub fn login_loop() -> Result<()> {
    loop {
        let method = Select::new("Welcome to KSeF-bot. How would you like to log in?", crate::auth::LoginMethod::iter().collect()).prompt()?;
        let logged_in = match method {
            crate::auth::LoginMethod::Google => crate::auth::login_with_google()?,
            crate::auth::LoginMethod::Microsoft => crate::auth::login_with_microsoft()?,
            crate::auth::LoginMethod::Facebook => crate::auth::login_with_facebook()?,
            crate::auth::LoginMethod::Email => crate::auth::login_with_email_loop()?
        };
        if logged_in {
            println!("Login successful.");
            println!();
            return Ok(())
        }
    }
}

pub async fn main_loop() -> Result<()> {
    loop {
        match Select::new("What shall we do now?", MainMenuAction::iter().collect()).prompt()? {
            MainMenuAction::CreateSalesInvoice => invoices::create_sales_invoice()?,
            MainMenuAction::ListSalesInvoices => invoices::list_sales_invoices().await?,
            MainMenuAction::ListPurchaseInvoices => invoices::list_purchase_invoices().await?,
            MainMenuAction::CreateContractor => contractors::create_customer()?,
            MainMenuAction::ListContractors => contractors::list_customers()?,
            MainMenuAction::UserSettings => settings::edit_profile()?,
            MainMenuAction::Exit => return Ok(())
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