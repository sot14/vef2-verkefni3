CREATE TABLE IF NOT EXISTS signatures(
  id serial primary key,
  name character varying(128) not null,
  nationalId varchar(10) not null unique,
  comment varchar(400) not null,
  anonymous boolean not null default true,
  signed timestamp with time zone not null default current_timestamp
);

CREATE TABLE IF NOT EXISTS users(
  id serial primary key,
  username character varying(255) not null unique,
  password character varying(255) not null,
  admin boolean default false
);
