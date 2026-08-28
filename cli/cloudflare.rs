// -------------------------------------------------------------------------------------------------
// Cloudflare auth
// -------------------------------------------------------------------------------------------------

#[macro_export]
macro_rules! client_id {
    () => {
        obfstr::obfstr!("ec663ac850bcfb511f8439df52635f55.access")
    };
}

#[macro_export]
macro_rules! client_secret {
    () => {
        obfstr::obfstr!("c7a9fa6e563c9e290cb941b39de135a48878653d9e64476e3970fbd8466816a1")
    };
}

#[macro_export]
macro_rules! api_key {
    () => {
        obfstr::obfstr!("55oUrQjUlwlZYCS30WGfpMMZCiQkfKpt")
    };
}