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
        {name: "KSeF"},
        {name: "DB"}
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
                                                name: {type: "string"},
                                                email: {type: "string"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {description: "Unauthorized"},
                    "500": {description: "Failed to decode JWT"}
                }
            }
        },
        "/ksef": {
            get: {
                summary: "List invoices from KSeF",
                tags: ["KSeF"],
                responses: {
                    "200": {description: "Invoices found"},
                    "401": {description: "Unauthorized"}
                }
            },
            post: {
                summary: "Submit new invoice to KSeF",
                tags: ["Invoices"],
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
                    "200": {description: "Invoice submitted"},
                    "400": {description: "Invalid invoice"},
                    "401": {description: "Unauthorized"}
                }
            }
        },
        "/db/invoices": {
            get: {
                summary: "Get invoices from database",
                tags: ["DB"],
                parameters: [
                    {
                        name: "invoiceId",
                        in: "query",
                        required: false,
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    "200": {description: "Invoice records"},
                    "401": {description: "Unauthorized"},
                    "404": {description: "Invoice not found"}
                }
            },
            post: {
                summary: "Create invoice database record",
                tags: ["DB"],
                responses: {
                    "200": {description: "Invoice stored"},
                    "401": {description: "Unauthorized"}
                }
            }
        },
        "/db/customers": {
            get: {
                summary: "Get customers",
                tags: ["DB"],
                responses: {
                    "200": {description: "Customer records"},
                    "401": {description: "Unauthorized"},
                    "404": {description: "Customer not found"}
                }
            },
            post: {
                summary: "Create customer",
                tags: ["DB"],
                responses: {
                    "200": {description: "Customer created"},
                    "401": {description: "Unauthorized"}
                }
            }
        },
        "/db/taxes": {
            get: {
                summary: "Get tax definitions",
                tags: ["DB"],
                responses: {
                    "200": {description: "Tax records"},
                    "401": {description: "Unauthorized"},
                    "404": {description: "Tax record not found"}
                }
            },
            post: {
                summary: "Create tax record",
                tags: ["DB"],
                responses: {
                    "200": {description: "Tax record created"},
                    "401": {description: "Unauthorized"}
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