export type NewsJSON = {
  hash: string;
  data: NewsItemJSON[];
};

export type NewsItemJSON = {
  id: string;
  reg: string;
  title: string;
  kind: string;
  kindTxt: string;
  banner: string;
  isImportant: string;
  stAt: string;
  newAt: string;
  link: string;
};
