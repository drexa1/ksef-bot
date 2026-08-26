use anyhow::Result;
use crossterm::{
    cursor::MoveTo,
    event::{self, Event, KeyEventKind},
    execute,
    terminal::{Clear, ClearType, disable_raw_mode, enable_raw_mode},
};
use inquire::{Select, ui::RenderConfig};
use std::io::{self, Write};
use std::time::Duration;

mod auth;
mod invoices;
mod contractors;
mod settings;

fn main() -> Result<()> {
    auth::login_flow(&RenderConfig::default())?;
    main_flow(&RenderConfig::default())?;
    Ok(())
}

fn pause() -> Result<()> {
    println!();
    print!("Press any key to go back to the main menu...");
    io::stdout().flush()?;
    enable_raw_mode()?;
    loop {
        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key_event) = event::read()? {
                if key_event.kind == KeyEventKind::Press {
                    break;
                }
            }
        }
    }
    disable_raw_mode()?;
    execute!(io::stdout(), Clear(ClearType::All), MoveTo(0, 0))?;
    Ok(())
}

// -------------------------------------------------------------------------------------------------
// Main loop
// -------------------------------------------------------------------------------------------------
fn main_flow(render_config: &RenderConfig) -> Result<()> {
    loop {
        let action = Select::new("What shall we do now?", vec![
            "1. List invoices",
            "2. Create invoice",
            "3. List contractors",
            "4. Create contractors",
            "5. Edit profile"
        ]).with_render_config(render_config.clone()).prompt()?;
        match action {
            "1. List invoices"      => invoices::list_invoices()?,
            "2. Create invoice"     => invoices::create_invoice()?,
            "3. List contractors"   => contractors::list_customers()?,
            "4. Create contractors" => contractors::create_customer(render_config)?,
            "5. Edit profile"       => settings::edit_profile()?,
            _                       => unreachable!()
        }
        pause()?
    }
}

