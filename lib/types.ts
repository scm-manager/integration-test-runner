export type UserThisObject = {
  user?: User;
};

export type User = {
  username: string;
  password: string;
};

export type FilesThisObject = {
  files?: File[];
};

export type FileThisObject = {
  file?: File;
};

export type File = {
  name: string;
  path: string;
  content: string;
};

export type RepositoryThisObject = {
  repository?: Repository;
};

export type Repository = {
  namespace: string;
  name: string;
};
