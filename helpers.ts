export const withAuth = (request: any) => ({
  ...request,
  auth: {
    user: Cypress.env("USERNAME"),
    pass: Cypress.env("PASSWORD"),
    sendImmediately: true
  }
});
