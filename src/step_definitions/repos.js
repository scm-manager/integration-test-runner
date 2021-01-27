const hri = require('human-readable-ids').hri;

Given("A git repository exists", function () {
    const namespace = hri.random();
    const name = hri.random();
    cy.restCreateRepo("git", namespace, name, true);
    this.repository = {namespace, name}
    this.file = { name: "README.md", path: "", content: "" };
});

Given("User has permission to read and write repository", function () {
    cy.restSetUserRepositoryRole(this.user.username, this.repository.namespace, this.repository.name, "WRITE");
});

Given("User has permission to read repository", function () {
    cy.restSetUserRepositoryRole(this.user.username, this.repository.namespace, this.repository.name, "READ");
});