const login = (username, password) => {
    cy.visit("/login");
    cy.byTestId("username-input").type(username);
    cy.byTestId("password-input").type(password);
    cy.byTestId("login-button").click();
};

const setAnonymousMode = anonymousMode => {
    cy.byTestId("primary-navigation-admin").click();
    cy.byTestId("admin-settings-link").click();
    cy.byTestId("anonymous-mode-select")
        .select(anonymousMode)
        .should("have.value", anonymousMode);
    cy.byTestId("submit-button").click();
};

Cypress.Commands.add("login", login);
Cypress.Commands.add("setAnonymousMode", setAnonymousMode);
Cypress.Commands.add("byTestId", testId => cy.get(`[data-testid=${testId}]`));
Cypress.Commands.add("containsNotByTestId", (container, testId) => cy.get(container).not(`[data-testid=${testId}]`));
