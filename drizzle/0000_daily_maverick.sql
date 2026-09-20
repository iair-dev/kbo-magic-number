CREATE SCHEMA "kbo_magic";
--> statement-breakpoint
CREATE TABLE "kbo_magic"."games" (
	"id" text PRIMARY KEY NOT NULL,
	"season" integer NOT NULL,
	"game_date" date NOT NULL,
	"game_time" text NOT NULL,
	"away_team" text NOT NULL,
	"home_team" text NOT NULL,
	"away_score" integer,
	"home_score" integer,
	"stadium" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbo_magic"."standings_snapshots" (
	"recorded_at" timestamp with time zone NOT NULL,
	"season" integer NOT NULL,
	"team" text NOT NULL,
	"rank" integer NOT NULL,
	"games" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"draws" integer NOT NULL,
	"win_rate" numeric(5, 4) NOT NULL,
	"games_behind" numeric(4, 1),
	"streak" text NOT NULL,
	CONSTRAINT "standings_snapshots_recorded_at_team_pk" PRIMARY KEY("recorded_at","team")
);
--> statement-breakpoint
CREATE TABLE "kbo_magic"."sync_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kbo_magic"."sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "kbo_magic"."teams" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
