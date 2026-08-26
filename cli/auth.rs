use anyhow::Result;
use inquire::{Confirm, Password, Select, Text, ui::RenderConfig};

pub fn login_flow(render_config: &RenderConfig) -> Result<()> {
    loop {
        let method = Select::new("Welcome to KSeF-bot. How would you like to log in?", vec![
            "Google",
            "Microsoft",
            "Facebook",
            "Email"
        ]).with_render_config(render_config.clone()).prompt()?;
        let logged_in = match method {
            "Google"    => login_with_google()?,
            "Microsoft" => login_with_microsoft()?,
            "Facebook"  => login_with_facebook()?,
            "Email"     => email_login_flow(render_config)?,
            _           => unreachable!()
        };
        if logged_in {
            println!("Login successful.");
            println!();
            return Ok(())
        }
    }
}

fn email_login_flow(render_config: &RenderConfig) -> Result<bool> {
    println!("--- Email login ---");
    let email = Text::new("Email address")
        .with_placeholder("you@example.com")
        .with_render_config(render_config.clone())
        .prompt()?;
    println!("Checking account for {email}...");
    if account_exists(&email)? {
        println!("Account found.");
        let password = Password::new("Password")
            .with_render_config(render_config.clone())
            .prompt()?;
        println!("Authenticating...");
        return login_with_email(&email, &password)
    }
    println!("No account found for {email}.");
    let create = Confirm::new("Would you like to create an account?")
        .with_default(true)
        .with_help_message("Create an account with this email")
        .with_render_config(render_config.clone())
        .prompt()?;
    if create {
        create_account(&email)?;
        println!("Account created successfully");
        println!("We've sent a verification link to:");
        println!("{email}");
        println!("Please verify your email and then log in.");
    } else {
        println!("Account creation cancelled.");
    }
    Ok(false)
}

fn login_with_google() -> Result<bool> {
    println!("Opening Google authentication...");
    println!("Waiting for Google OAuth callback...");
    Ok(true)
}

fn login_with_microsoft() -> Result<bool> {
    println!("Opening Microsoft authentication...");
    println!("Waiting for Microsoft OAuth callback...");
    Ok(true)
}

fn login_with_facebook() -> Result<bool> {
    println!("Opening Facebook authentication...");
    println!("Waiting for Facebook OAuth callback...");
    Ok(true)
}

fn account_exists(email: &str) -> Result<bool> {
    println!("  [API] GET /auth/account-exists");
    println!("  [API] email = {email}");
    println!("  [API] Response: account not found");
    // Change to true to test the password flow.
    Ok(false)
}

fn login_with_email(email: &str, password: &str) -> Result<bool> {
    let _ = password;
    println!("  [API] POST /auth/login");
    println!("  [API] email = {email}");
    println!("  [API] password = ********");
    println!("  [API] Response: authentication successful");
    Ok(true)
}

fn create_account(email: &str) -> Result<()> {
    println!("Creating account...");
    println!("  [API] POST /auth/register");
    println!("  [API] email = {email}");
    println!("  [API] Creating account record...");
    println!("  [EMAIL] Verification email sent.");
    Ok(())
}