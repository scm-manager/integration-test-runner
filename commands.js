require("cypress-file-upload");
const { withAuth } = require("./helpers");

const defaultScmManagerConfig = {
  proxyPassword: null,
  proxyPort: 8080,
  proxyServer: "proxy.mydomain.com",
  proxyUser: null,
  enableProxy: false,
  realmDescription: "SONIA :: SCM Manager",
  disableGroupingGrid: false,
  dateFormat: "YYYY-MM-DD HH:mm:ss",
  anonymousMode: "OFF",
  baseUrl: Cypress.env('SERVER_BASE_URL'),
  forceBaseUrl: false,
  loginAttemptLimit: 100,
  proxyExcludes: [],
  skipFailedAuthenticators: false,
  pluginUrl:
    "https://plugin-center-api.scm-manager.org/api/v1/plugins/{version}?os={os}&arch={arch}&x=u",
  loginAttemptLimitTimeout: 300,
  enabledXsrfProtection: true,
  enabledUserConverter: false,
  namespaceStrategy: "CustomNamespaceStrategy",
  loginInfoUrl: "https://login-info.scm-manager.org/api/v1/login-info",
  releaseFeedUrl: "https://scm-manager.org/download/rss.xml",
  mailDomainName: "scm-manager.local"
};

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
  const loginUrl = `/api/v2/auth/access_token`;

  cy.request({
    method: "POST",
    url: loginUrl,
    body: {
      cookie: true,
      username,
      password,
      grant_type: "password"
    }
  });
};

const restLogout = () => {
  const logoutUrl = `/api/v2/auth/access_token`;

  cy.request(
    withAuth({
      method: "DELETE",
      url: logoutUrl
    })
  );
};

const restSetAnonymousMode = anonymousMode => {
  return restSetConfig({ anonymousMode });
};

const restSetConfig = (config = {}) => {
  const configUrl = `/api/v2/config`;
  cy.request(
    withAuth({
      method: "PUT",
      url: configUrl,
      headers: {
        "Content-Type": "application/vnd.scmm-config+json;v=2"
      },
      body: { ...defaultScmManagerConfig, ...config }
    })
  );
};

const restSetUserPermissions = (username, permissions) => {
  const url = `/api/v2/users/${encodeURIComponent(
    username
  )}/permissions`;
  cy.request(
    withAuth({
      method: "PUT",
      url,
      headers: {
        "Content-Type": "application/vnd.scmm-permissionCollection+json;v=2"
      },
      body: {
        permissions
      }
    })
  );
};

const restSetUserRepositoryRole = (username, namespace, name, role) => {
  const url = `/api/v2/repositories/${encodeURIComponent(
    namespace
  )}/${encodeURIComponent(name)}/permissions`;
  cy.request(
    withAuth({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/vnd.scmm-repositoryPermission+json;v=2"
      },
      body: {
        name: username,
        role,
        groupPermission: false,
        verbs: []
      }
    })
  );
};

const restCreateUser = (username, password) => {
  const url = `/api/v2/users`;
  cy.request(
    withAuth({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/vnd.scmm-user+json;v=2"
      },
      body: {
        name: username,
        displayName: username,
        mail: `${username}@hitchhiker.com`,
        password,
        active: true
      }
    })
  );
};

const restCreateRepo = (type, namespace, name, initialize) => {
  const reposUrl =
      `/api/v2/repositories` +
    (initialize ? "?initialize=true" : "");

  return cy.request(
    withAuth({
      method: "POST",
      url: reposUrl,
      headers: {
        "Content-Type": "application/vnd.scmm-repository+json;v=2"
      },
      body: {
        name,
        namespace,
        type
      }
    })
  );
};

Cypress.Commands.add("restCreateRepo", restCreateRepo);
Cypress.Commands.add("restLogin", restLogin);
Cypress.Commands.add("restLogout", restLogout);
Cypress.Commands.add("restSetAnonymousMode", restSetAnonymousMode);
Cypress.Commands.add("restSetConfig", restSetConfig);
Cypress.Commands.add("restSetUserPermissions", restSetUserPermissions);
Cypress.Commands.add("restSetUserRepositoryRole", restSetUserRepositoryRole);
Cypress.Commands.add("restCreateUser", restCreateUser);
Cypress.Commands.add("login", login);
Cypress.Commands.add("setAnonymousMode", setAnonymousMode);
Cypress.Commands.add("byTestId", testId => cy.get(`[data-testid=${testId}]`));
Cypress.Commands.add("containsNotByTestId", (container, testId) =>
  cy.get(container).not(`[data-testid=${testId}]`)
);
