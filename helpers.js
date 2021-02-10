exports.withAuth = request => ({
  ...request,
  auth: {
    user: Cypress.env("USERNAME"),
    pass: Cypress.env("PASSWORD"),
    sendImmediately: true
  }
});
