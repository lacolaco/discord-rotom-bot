export type NewsJSON = {
  hash: string;
  data: NewsItemJSON[];
};

export type NewsItemJSON = {
  id: string;
  reg: number;
  title: string;
  infoTab: number;
  infoKind: number;
  kindTxt: string;
  banner: string;
  isImportant: number;
  stAt: number;
  endAt: string;
  link: string;
  pubAt: number;
  linkRom: unknown[];
};
