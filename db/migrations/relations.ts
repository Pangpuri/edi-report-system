import { relations } from "drizzle-orm/relations";
import { user, account, session, branches, importLogs, rawFileArchives } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const importLogsRelations = relations(importLogs, ({one}) => ({
	branch: one(branches, {
		fields: [importLogs.branchId],
		references: [branches.id]
	}),
}));

export const branchesRelations = relations(branches, ({many}) => ({
	importLogs: many(importLogs),
	rawFileArchives: many(rawFileArchives),
}));

export const rawFileArchivesRelations = relations(rawFileArchives, ({one}) => ({
	branch: one(branches, {
		fields: [rawFileArchives.branchId],
		references: [branches.id]
	}),
}));