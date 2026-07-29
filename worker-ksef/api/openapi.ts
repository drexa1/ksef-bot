export const openApiSpec = {
    openapi: "3.0.0",
    info: {
        title: "ksef-bot-api",
        version: "1.0.0"
    },
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "X-API-Key"
            }
        },
        schemas: {
            User: {
                type: "object",
                additionalProperties: false,
                properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    name: { type: "string" },
                    api_key: { type: "string" },
                    created_at: { type: "string" },
                    updated_at: { type: "string" }
                }
            },
            Invoice: {
                type: "object",
                additionalProperties: false,
                properties: {
                    id: { type: "string" },
                    user_id: { type: "string" },
                    seller_id: { type: "string" },
                    buyer_id: { type: "string" },
                    country_code: { type: "string" },
                    raw_xml: { type: "string" },
                    json_data: { type: "string" },
                    created_at: { type: "string" },
                    updated_at: { type: "string" }
                }
            },
            Counterparty: {
                type: "object",
                additionalProperties: false,
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    nip: { type: "string" },
                    pesel: { type: "string" },
                    regon: { type: "string" },
                    internal_identifier: { type: "string" },
                    country: { type: "string" },
                    voivodeship: { type: "string" },
                    county: { type: "string" },
                    municipality: { type: "string" },
                    town: { type: "string" },
                    zip_code: { type: "string" },
                    mail: { type: "string" },
                    street: { type: "string" },
                    building_number: { type: "string" },
                    number_of_premises: { type: "integer" },
                    phone_number: { type: "string" },
                    email_address: { type: "string" },
                    bank_account_number: { type: "string" },
                    notes: { type: "string" },
                    created_at: { type: "string" },
                    updated_at: { type: "string" }
                }
            }
        }
    },
    security: [{ ApiKeyAuth: [] }],
    tags: [
        { name: "Health" },
        { name: "Auth" },
        { name: "KSeF" },
        { name: "DB" },
        { name: "Users" },
        { name: "Invoices" },
        { name: "Counterparties" }
    ],
    paths: {
        "/health": {
            get: {
                summary: "Health check",
                tags: ["Health"],
                responses: {
                    "200": { description: "OK" }
                }
            }
        },
        "/whoami": {
            get: {
                summary: "Get current authenticated user",
                tags: ["Auth"],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    "200": {
                        description: "Current user info",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        user: {
                                            type: "object",
                                            properties: {
                                                name: { type: "string" },
                                                email: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": { description: "Unauthorized" },
                    "500": { description: "Failed to decode JWT" }
                }
            }
        },
        "/ksef": {
            get: {
                summary: "List invoices from KSeF",
                tags: ["KSeF"],
                responses: {
                    "200": { description: "Invoices found" },
                    "401": { description: "Unauthorized" }
                }
            },
            post: {
                summary: "Submit new invoice to KSeF",
                tags: ["KSeF"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["invoice"],
                                properties: {
                                    invoice: {
                                        type: "object",
                                        description: "Invoice payload"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": { description: "Invoice submitted" },
                    "400": { description: "Invalid invoice" },
                    "401": { description: "Unauthorized" }
                }
            }
        },
        "/db": {
            get: {
                summary: "List available database entities",
                tags: ["DB"],
                responses: {
                    "200": { description: "Available database entities" }
                }
            }
        },
        "/db/users": {
            get: {
                summary: "List users",
                tags: ["Users"],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "User records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" }
                }
            },
            post: {
                summary: "Create or upsert a user",
                tags: ["Users"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/User" }
                        }
                    }
                },
                responses: {
                    "200": { description: "User stored" },
                    "401": { description: "Unauthorized" }
                }
            },
            put: {
                summary: "Update a user",
                tags: ["Users"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/User" }
                        }
                    }
                },
                responses: {
                    "200": { description: "User updated" },
                    "400": { description: "Bad request" },
                    "401": { description: "Unauthorized" }
                }
            },
            delete: {
                summary: "Delete a user",
                tags: ["Users"],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "User deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" }
                }
            }
        },
        "/db/invoices": {
            get: {
                summary: "List invoices",
                tags: ["Invoices"],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Invoice records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Invoice not found" }
                }
            },
            post: {
                summary: "Create or upsert an invoice",
                tags: ["Invoices"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Invoice" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Invoice stored" },
                    "401": { description: "Unauthorized" }
                }
            },
            put: {
                summary: "Update an invoice",
                tags: ["Invoices"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Invoice" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Invoice updated" },
                    "400": { description: "Bad request" },
                    "401": { description: "Unauthorized" }
                }
            },
            delete: {
                summary: "Delete an invoice",
                tags: ["Invoices"],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Invoice deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Invoice not found" }
                }
            }
        },
        "/db/counterparties": {
            get: {
                summary: "List counterparties",
                tags: ["Counterparties"],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Counterparty records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Counterparty not found" }
                }
            },
            post: {
                summary: "Create or upsert a counterparty",
                tags: ["Counterparties"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Counterparty" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Counterparty stored" },
                    "401": { description: "Unauthorized" }
                }
            },
            put: {
                summary: "Update a counterparty",
                tags: ["Counterparties"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Counterparty" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Counterparty updated" },
                    "400": { description: "Bad request" },
                    "401": { description: "Unauthorized" }
                }
            },
            delete: {
                summary: "Delete a counterparty",
                tags: ["Counterparties"],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Counterparty deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Counterparty not found" }
                }
            }
        }
    }
};

export const swaggerHtml = `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<title>API docs</title>
			<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"/>
		</head>
		<body>
			<div id="swagger-ui"></div>
			<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
			<script>
				// noinspection JSUnresolvedVariable
				SwaggerUIBundle({
					url: "/openapi.json",
					dom_id: "#swagger-ui",
				});
			</script>
		</body>
	</html>
`;