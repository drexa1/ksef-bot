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
                name: "X-API-Key",
                description: "Clients can authenticate using this header."
            }
        },
        schemas: {
            User: {
                type: "object",
                additionalProperties: false,
                required: [
                    "email"
                ],
                properties: {
                    email: {
                        type: "string",
                        description: "This will be matched against the authenticated user."
                    },
                    name: {
                        type: "string",
                        description: "Full user name as shown on the invoices."
                    },
                    api_key: {
                        type: "string",
                        description: "In case the user has been granted an API key."
                    }
                }
            },
            Counterparty: {
                type: "object",
                additionalProperties: false,
                required: [
                    "name",
                    "address_l1"
                ],
                properties: {
                    name: {
                        type: "string",
                        description: "Full user name as shown on the invoices."
                    },
                    nip: {
                        type: "string",
                        description: "PL tax payer identifier."
                    },
                    pesel: {
                        type: "string",
                        description: "PL national identifier."
                    },
                    regon: {
                        type: "string",
                        description: "PL unique business identifier."
                    },
                    internal_identifier: {
                        type: "string",
                        description: "In case none of the other identifiers are available."
                    },
                    country_code: {
                        type: "string",
                        default: "PL",
                        description: "Two letter country code.",
                    },
                    address_l1: {
                        type: "string",
                        description: "Primary address.",
                    },
                    address_l2: {
                        type: "string",
                        description: "Optional secondary address.",
                    },
                    local_government_unit: {
                        type: "integer",
                        description: "(JST) 0: NA, 1: municipality, 2: county, 3: voivodeship.",
                    },
                    vat_group: {
                        type: "integer",
                        description: "(GV) 1: invoice concerns a VAT group member, 2: invoice does not concern a VAT group member.",
                    },
                    notes: {
                        type: "string"
                    }
                }
            },
            Invoice: {
                type: "object",
                additionalProperties: false,
                required: [
                    "seller_id",
                    "buyer_id",
                    "raw_xml"
                ],
                properties: {
                    seller_id: {
                        type: "string",
                        description: "Seller unique ID.",
                    },
                    buyer_id: {
                        type: "string",
                        description: "Seller unique ID.",
                    },
                    country_code: {
                        type: "string",
                        default: "PL",
                        description: "Two letter country code.",
                    },
                    raw_xml: {
                        type: "string",
                        description: "Original XML body of the document.",
                    },
                    json_data: {
                        type: "string",
                        description: "Formatted JSON of the original XML document.",
                    },
                    notes: {
                        type: "string"
                    }
                }
            },
            TaxRecord: {
                type: "object",
                additionalProperties: false,
                required: [
                    "period",
                    "brut_income"
                ],
                properties: {
                    period: {
                        type: "string",
                        description: "Invoicing period in format YYYY-MM.",
                    },
                    brut_income: {
                        type: "number",
                        description: "Brut income. Typically the hourly rate × number of hours",
                    },
                    vat_percentage: {
                        type: "number",
                        default: 23,
                        description: "By default standard VAT rate of 23%."
                    },
                    tax_rate: {
                        type: "number",
                        default: 12,
                        description: "By default standard flat rate of 12%."
                    },
                    health_insurance_base: {
                        type: "number",
                        default: 5537.18,
                        description: "Statutory monthly base = 60% × average monthly salary."
                    },
                    health_insurance_rate: {
                        type: "number",
                        default: 9,
                        description: "PL health insurance law: 9% of the contribution base."
                    },
                    total_clean_revenue: {
                        type: "number",
                        description: "Clean revenue after obligations"
                    },
                    notes: {
                        type: "string"
                    }
                }
            }
        }
    },
    tags: [
        { name: "Health" },
        { name: "Auth" },
        { name: "KSeF" },
        { name: "App" }
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
        "/ksef/sales": {
            get: {
                summary: "List sales invoices at KSeF - Restricted to resources owned by the authenticated user.",
                tags: ["KSeF"],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    "200": { description: "Invoices found" },
                    "401": { description: "Unauthorized" },
                }
            },
            post: {
                summary: "Submit new sales invoice to KSeF - Restricted to resources owned by the authenticated user.",
                tags: ["KSeF"],
                security: [{ ApiKeyAuth: [] }],
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
        "/ksef/purchases": {
            get: {
                summary: "List purchases invoices at KSeF - Restricted to resources owned by the authenticated user.",
                tags: ["KSeF"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: "from",
                        in: "query",
                        required: true,
                        description: "Start date",
                        schema: { type: "string", format: "date", example: "2026-06-01" }
                    }, {
                        name: "to",
                        in: "query",
                        required: true,
                        description: "End date",
                        schema: { type: "string", format: "date", example: "2026-07-01" }
                    }
                ],
                responses: {
                    "200": { description: "Purchase invoices" },
                    "400": { description: "Invalid date params" },
                    "401": { description: "Unauthorized" }
                }
            }
        },
        "/app/users": {
            get: {
                summary: "List users - Allowed only for admin users.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "User records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" }
                }
            },
            post: {
                summary: "Create a user - Allowed only for admin users.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/User" }
                        }
                    }
                },
                responses: {
                    "200": { description: "User created" },
                    "401": { description: "Unauthorized" }
                }
            },
            put: {
                summary: "Update a user - Allowed only for admin users.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
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
                summary: "Delete a user - Allowed only for admin users.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "User deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" }
                }
            }
        },
        "/app/counterparties": {
            get: {
                summary: "List counterparties - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Counterparty records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Counterparty not found" }
                }
            },
            post: {
                summary: "Create a counterparty - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
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
                summary: "Update a counterparty - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
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
                summary: "Delete a counterparty - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Counterparty deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Counterparty not found" }
                }
            }
        },
        "/app/invoices": {
            get: {
                summary: "List invoices - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Invoice records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Invoice not found" }
                }
            },
            post: {
                summary: "Upload an invoice XML - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["file"],
                                properties: {
                                    file: {
                                        type: "string",
                                        format: "binary",
                                        description: "Invoice XML file"
                                    },
                                    notes: {
                                        type: "string",
                                        description: "Optional notes"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": { description: "Invoice created" },
                    "401": { description: "Unauthorized" }
                }
            },
            put: {
                summary: "Update an invoice - Unsupported operation.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    "405": { description: "Method Not Allowed - Invoice updates are not supported" }
                }
            },
            delete: {
                summary: "Delete an invoice - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Invoice deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Invoice not found" }
                }
            }
        },
        "/app/taxes": {
            get: {
                summary: "List taxes records - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Tax records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Taxes record not found" }
                }
            },
            post: {
                summary: "Create a taxes record - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/TaxRecord" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Taxes record created" },
                    "401": { description: "Unauthorized" }
                }
            },
            put: {
                summary: "Update a taxes record - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/TaxRecord" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Tax record updated" },
                    "400": { description: "Bad request" },
                    "401": { description: "Unauthorized" }
                }
            },
            delete: {
                summary: "Delete a taxes record - Restricted to resources owned by the authenticated user.",
                tags: ["App"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Taxes record deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Taxes record not found" }
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