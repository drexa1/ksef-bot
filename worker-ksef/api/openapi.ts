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
        }
    },
    security: [{ ApiKeyAuth: [] }],
    tags: [
        {name: "Health"},
        {name: "Auth"},
        {name: "Invoices"},
        {name: "KV"}
    ],
    paths: {
        "/health": {
            get: {
                summary: "Health check",
                tags: ["Health"],
                responses: {
                    "200": {description: "OK"}
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
        "/invoices": {
            get: {
                summary: "Get invoice by ID",
                tags: ["Invoices"],
                parameters: [
                    {
                        name: "invoiceId",
                        in: "query",
                        required: true,
                        schema: {type: "string"}
                    }
                ],
                responses: {
                    "200": {
                        description: "Invoice found",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {type: "object"}
                                }
                            }
                        }
                    },
                    "401": {description: "Unauthorized"},
                    "404": {description: "Invoice not found"}
                }
            },
            post: {
                summary: "Submit new invoice",
                tags: ["Invoices"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["invoice"],
                                properties: {
                                    mfcc: {
                                        type: "object",
                                        additionalProperties: {type: "string"},
                                        description: "XML with the invoice"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {description: "Invoice submitted"},
                    "400": {description: "Invalid invoice"},
                    "401": {description: "Unauthorized"}
                }
            }
        },
        "/kv": {
            get: {
                summary: "Get KV value by invoiceId or list keys",
                tags: ["KV"],
                parameters: [
                    {
                        name: "invoiceId",
                        in: "query",
                        required: false,
                        schema: {type: "string"},
                        description: "The key/invoiceId to look up in KV storage"
                    }
                ],
                responses: {
                    "200": {
                        description: "KV stringified data or list results returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object"
                                }
                            }
                        }
                    },
                    "401": {description: "Unauthorized"},
                    "404": {description: "Invoice not found"}
                }
            },
            put: {
                summary: "Upsert metadata into KV namespace",
                tags: ["KV"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["id"],
                                properties: {
                                    id: {type: "string"},
                                    values: {
                                        type: "object",
                                        additionalProperties: {type: "number"}
                                    },
                                    metadata: {
                                        type: "object",
                                        additionalProperties: true
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {description: "KV put operation acknowledged"},
                    "401": {description: "Unauthorized"}
                }
            },
            delete: {
                summary: "Delete KV value by invoiceId",
                tags: ["KV"],
                parameters: [
                    {
                        name: "invoiceId",
                        in: "query",
                        required: false,
                        schema: {type: "string"}
                    }
                ],
                responses: {
                    "200": {description: "KV delete operation acknowledged"},
                    "401": {description: "Unauthorized"},
                    "404": {description: "Invoice not found"}
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
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
        </head>
        <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
            <script>
                // noinspection JSUnresolvedVariable
                SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });
            </script>
        </body>
    </html>
`;