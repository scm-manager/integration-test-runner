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

const hri = require('human-readable-ids').hri;

Given("User is authenticated", function () {
    const username = hri.random();
    const password = hri.random();
    cy.restCreateUser(username, password);
    cy.restLogin(username, password);
    this.user = {username, password};
});

Given("User is not authenticated", () => {
    cy.restLogout();
});

Then("User should be anonymous", () => {
    cy.byTestId("scm-anonymous");
});

Then("User should be authenticated", function () {
    cy.byTestId(this.user.username);
});

When("Users clicks login button", () => {
    cy.byTestId("login-button").click();
});

When("User logs in", function () {
    if (!this.user) {
        this.user = {
            username: hri.random(),
            password: hri.random()
        };
    }
    const {username, password} = this.user;
    cy.restCreateUser(username, password);
    cy.login(username, password);
});
