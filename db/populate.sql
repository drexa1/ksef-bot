-- Create admin user
INSERT INTO users (id, email, phone, companyLogo, apiKey, tier, ksefApiToken, defaultItemName, defaultHourlyRate, bankName, bankAccountNumber) VALUES (
    '6751577878',
    'drexa1@hotmail.com',
    '+48518121343',
    X'0000010001002020000001002000A8040000160000002800000020000000400000000100200000000000000000000000000000000000000000000000000029B880FF2AB880FF2BB880FF2CB980FF2DB980FF2EB980FF2FB980FF30BA80FF31BA80FF32BA80FF',
    '55oUrQjUlwlZYCS30WGfpMMZCiQkfKpt',
    0,
    '20260804-EC-4716384000-AD6886D9B2-BB|nip-6751577878|ca23b48587d545ad8e7fed96420e4dbe6d78e7cf72844981ac702fe2aeb8a145',
    'Usługi informatyczne',
    160,
    'PKO Bank Polski',
    '80102028920000550210154088'
);

-- Customer contractor
INSERT INTO contractors (id, ownerId, name, NIP, addressL1, localGovernmentUnit, vatGroup, notes) VALUES (
    'nanoid-customer-contractor',
    '6751577878',
    'Virtus Lab sp. z o.o.',
    '5170312965',
    'Kraków, 31-153, Szlak 49',
    2,
    2,
    'buyer'
);

-- User contractor
INSERT INTO contractors (id, ownerId, name, NIP, addressL1, notes) VALUES (
    'nanoid-user-contractor',
    '6751577878',
    'Diego Ruiz Barbero Software Engineering & Data Science',
    '6751577878',
    'Kraków, 30-638, 15/32',
    'seller'
);
UPDATE users SET contractorId = 'nanoid-user-contractor' WHERE id == '6751577878';