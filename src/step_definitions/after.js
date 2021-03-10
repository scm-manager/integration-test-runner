after(function () {
    cy.restLogout();
    cy.visit("/");
}