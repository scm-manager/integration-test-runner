import { Given } from "cypress-cucumber-preprocessor/steps";
import { FileThisObject, RepositoryThisObject, UserThisObject } from "../types";

const hri = require("human-readable-ids").hri;

Given("A git repository exists", function(this: RepositoryThisObject & FileThisObject) {
  const namespace = hri.random();
  const name = hri.random();
  cy.restCreateRepo("git", namespace, name, true);
  this.repository = { namespace, name };
  this.file = { name: "README.md", path: "", content: "" };
});

Given("User has permission to read and write repository", function(this: RepositoryThisObject & UserThisObject) {
  cy.restSetUserRepositoryRole(this.user!.username, this.repository!.namespace, this.repository!.name, "WRITE");
});

Given("User has permission to read repository", function(this: RepositoryThisObject & UserThisObject) {
  cy.restSetUserRepositoryRole(this.user!.username, this.repository!.namespace, this.repository!.name, "READ");
});
