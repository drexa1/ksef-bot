use anyhow::Result;
use inquire::{Confirm, Password, Select, Text};
use strum::{Display, EnumIter, IntoEnumIterator};

#[derive(Clone, Display, EnumIter)]
enum LoginMethod {
    #[strum(to_string = "Google")] Google,
    #[strum(to_string = "Microsoft")] Microsoft,
    #[strum(to_string = "Facebook")] Facebook,
    #[strum(to_string = "Email")] Email
}

pub fn login_loop() -> Result<()> {
    loop {
        let method = Select::new("Welcome to KSeF-bot. How would you like to log in?", LoginMethod::iter().collect()).prompt()?;
        let logged_in = match method {
            LoginMethod::Google => login_with_google()?,
            LoginMethod::Microsoft => login_with_microsoft()?,
            LoginMethod::Facebook => login_with_facebook()?,
            LoginMethod::Email => login_with_email_loop()?
        };
        if logged_in {
            println!("Login successful.");
            println!();
            return Ok(())
        }
    }
}

// -------------------------------------------------------------------------------------------------
// Login with SSO
// -------------------------------------------------------------------------------------------------

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

// -------------------------------------------------------------------------------------------------
// Login with email
// -------------------------------------------------------------------------------------------------

fn login_with_email_loop() -> Result<bool> {
    let email = Text::new("Email address").with_placeholder("you@example.com").prompt()?;
    if account_exists(&email)? {
        println!("Account found.");
        let password = Password::new("Password").prompt()?;
        return login_with_email(&email, &password)
    }
    println!("No account found for {email}.");
    let create = Confirm::new("Would you like to create an account?")
        .with_default(true)
        .with_help_message("Create an account with this email")
        .prompt()?;
    if create {
        create_account(&email)?;
        println!("Account created successfully");
        println!("We've sent a verification link to: {email} - Please verify your email and continue to log in.");
    } else {
        println!("Account creation cancelled.");
    }
    Ok(false)
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