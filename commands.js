const { withAuth } = require('./helpers');

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

const restLogin = (username, password) => {
    const loginUrl = "http://localhost:8081/scm/api/v2/auth/access_token";

    cy.request({
        method: "POST",
        url: loginUrl,
        body: {
            cookie: true,
            username,
            password,
            grant_type: "password",
        },
    });
};

const restLogout = () => {
    const logoutUrl = "http://localhost:8081/scm/api/v2/auth/access_token";

    cy.request(
        withAuth({
            method: "DELETE",
            url: logoutUrl,
        })
    );
};

const restSetAnonymousMode = (anonymousMode) => {
    const configUrl = "http://localhost:8081/scm/api/v2/config";

    const content = {
        proxyPassword: null,
        proxyPort: 8080,
        proxyServer: "proxy.mydomain.com",
        proxyUser: null,
        enableProxy: false,
        realmDescription: "SONIA :: SCM Manager",
        disableGroupingGrid: false,
        dateFormat: "YYYY-MM-DD HH:mm:ss",
        anonymousMode,
        baseUrl: "https://localhost:8081/scm",
        forceBaseUrl: false,
        loginAttemptLimit: 100,
        proxyExcludes: [],
        skipFailedAuthenticators: false,
        pluginUrl: "https://plugin-center-api.scm-manager.org/api/v1/plugins/{version}?os={os}&arch={arch}&x=u",
        loginAttemptLimitTimeout: 300,
        enabledXsrfProtection: true,
        enabledUserConverter: false,
        namespaceStrategy: "RepositoryTypeNamespaceStrategy",
        loginInfoUrl: "https://login-info.scm-manager.org/api/v1/login-info",
        releaseFeedUrl: "https://scm-manager.org/download/rss.xml",
        mailDomainName: "scm-manager.local",
    };
    cy.request(
        withAuth({
            method: "PUT",
            url: configUrl,
            headers: {
                "Content-Type": "application/vnd.scmm-config+json;v=2",
            },
            body: content,
        })
    );
};

const restSetPermission = (username, permissions) => {
    const url = `http://localhost:8081/scm/api/v2/users/${encodeURIComponent(username)}/permissions`;
    cy.request(
        withAuth({
            method: "PUT",
            url,
            headers: {
                "Content-Type": "application/vnd.scmm-permissionCollection+json;v=2",
            },
            body: {
                permissions,
            },
        })
    );
};

Cypress.Commands.add("restLogin", restLogin);
Cypress.Commands.add("restLogout", restLogout);
Cypress.Commands.add("restSetAnonymousMode", restSetAnonymousMode);
Cypress.Commands.add("restSetPermission", restSetPermission);
Cypress.Commands.add("login", login);
Cypress.Commands.add("setAnonymousMode", setAnonymousMode);
Cypress.Commands.add("byTestId", testId => cy.get(`[data-testid=${testId}]`));
Cypress.Commands.add("containsNotByTestId", (container, testId) => cy.get(container).not(`[data-testid=${testId}]`));
