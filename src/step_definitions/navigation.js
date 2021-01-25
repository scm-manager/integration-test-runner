/*
 * MIT License
 *
 * Copyright (c) 2020-present Cloudogu GmbH and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

When("User visits any page", () => {
  cy.visit("/home");
});

When("User visits login page", () => {
  cy.visit("/login/");
});

When("User visits the repository overview page", () => {
  cy.visit("/repos/");
});

When("User visits their user settings", () => {
  cy.visit("/me/settings/");
});

When("User visits code view of repository", function () {
  cy.visit(`/repo/${this.repository.namespace}/${this.repository.name}/code/sources/main`);
});

Then("The login page is shown", () => {
  cy.byTestId("login-button");
});

Then("There is a login button", () => {
  cy.byTestId("primary-navigation-login");
});

Then("The repository overview page is shown", () => {
  cy.byTestId("repository-overview-filter");
});
