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
                required: [
                    "email"
                ],
                properties: {
                    email: { type: "string" },
                    name: { type: "string" },
                    api_key: { type: "string" }
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
                    name: { type: "string" },
                    nip: { type: "string" },
                    pesel: { type: "string" },
                    regon: { type: "string" },
                    internal_identifier: { type: "string" },
                    country_code: {
                        type: "string",
                        default: "PL"
                    },
                    address_l1: { type: "string" },
                    address_l2: { type: "string" },
                    local_government_unit: { type: "integer" },
                    vat_group: { type: "integer" },
                    notes: { type: "string" }
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
                    seller_id: { type: "string" },
                    buyer_id: { type: "string" },
                    country_code: { type: "string" },
                    raw_xml: { type: "string" },
                    json_data: { type: "string" },
                    notes: { type: "string" }
                }
            }
        }
    },
    security: [{ ApiKeyAuth: [] }],
    tags: [
        { name: "Health" },
        { name: "Auth" },
        { name: "KSeF" },
        { name: "DB" }
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
                summary: "List invoices from KSeF - Restricted to resources owned by the authenticated user.",
                tags: ["KSeF"],
                responses: {
                    "200": { description: "Invoices found" },
                    "401": { description: "Unauthorized" }
                }
            },
            post: {
                summary: "Submit new invoice to KSeF - Restricted to resources owned by the authenticated user.",
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
        "/db/users": {
            get: {
                summary: "List users - Only allowed for admin users.",
                tags: ["DB"],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "User records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" }
                }
            },
            post: {
                summary: "Create or upsert a user - Only allowed for admin users.",
                tags: ["DB"],
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
                summary: "Update a user - Only allowed for admin users.",
                tags: ["DB"],
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
                summary: "Delete a user - Only allowed for admin users.",
                tags: ["DB"],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "User deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" }
                }
            }
        },
        "/db/counterparties": {
            get: {
                summary: "List counterparties - Restricted to resources owned by the authenticated user.",
                tags: ["DB"],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Counterparty records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Counterparty not found" }
                }
            },
            post: {
                summary: "Create or upsert a counterparty - Restricted to resources owned by the authenticated user.",
                tags: ["DB"],
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
                tags: ["DB"],
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
                tags: ["DB"],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Counterparty deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Counterparty not found" }
                }
            }
        },
        "/db/invoices": {
            get: {
                summary: "List invoices - Restricted to resources owned by the authenticated user.",
                tags: ["DB"],
                parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Invoice records" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Invoice not found" }
                }
            },
            post: {
                summary: "Create or upsert an invoice - Restricted to resources owned by the authenticated user.",
                tags: ["DB"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Invoice" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Invoice created" },
                    "401": { description: "Unauthorized" }
                }
            },
            put: {
                summary: "Update an invoice - Restricted to resources owned by the authenticated user.",
                tags: ["DB"],
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
                summary: "Delete an invoice - Restricted to resources owned by the authenticated user.",
                tags: ["DB"],
                parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Invoice deleted" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Invoice not found" }
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