const hri = require('human-readable-ids').hri;

Given("A git repository exists", function () {
    const namespace = Cypress.env("USERNAME");
    const name = hri.random();
    cy.restCreateRepo("git", namespace, name);
    this.repository = {namespace, name}
});

Given("User has permission to read and write repository", function () {
    cy.restSetUserRepositoryRole(this.user.username, Cypress.env("USERNAME"), this.repository.name, "WRITE");
});

Given("User has permission to read repository", function () {
    cy.restSetUserRepositoryRole(this.user.username, Cypress.env("USERNAME"), this.repository.name, "READ");
});