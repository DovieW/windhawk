import * as fs from 'fs';
import * as path from 'path';

type ProfileModConfig = {
	version?: string,
	disabled?: boolean,
	settings?: Record<string, any>,
	config?: {
		loggingEnabled?: boolean,
		debugLoggingEnabled?: boolean,
		include?: string[],
		exclude?: string[],
		includeCustom?: string[],
		excludeCustom?: string[],
		includeExcludeCustomOnly?: boolean,
		patternsMatchCriticalSystemProcesses?: boolean,
		architecture?: string[]
	}
};

type ConfigProfile = {
	name: string,
	created: number,
	mods: Record<string, ProfileModConfig>
};

type UserProfileType = {
	id?: string,
	os?: string,
	app: Partial<{
		version: string,
		latestVersion: string
	}>,
	mods: Record<string, Partial<{
		version: string,
		disabled: boolean,
		rating: number,
		latestVersion: string
	}> | undefined>,
	profiles?: {
		list: Record<string, ConfigProfile>,
		active: string[],
		mergeConfigs: boolean
	}
};

type onFileModified = (mtimeMs: number) => void;

export type { ProfileModConfig, ConfigProfile };

export class UserProfile {
	private userProfilePath: string;
	private userProfile: UserProfileType;
	private onFileModified?: onFileModified;

	public constructor(userProfilePath: string, onFileModified?: onFileModified) {
		this.userProfilePath = userProfilePath;
		this.onFileModified = onFileModified;

		let userProfileText: string | undefined;
		try {
			userProfileText = fs.readFileSync(userProfilePath, 'utf8');
		} catch (e) {
			// Ignore if file doesn't exist.
			if (e.code !== 'ENOENT') {
				throw e;
			}
		}

		let userProfile: any = {};
		if (userProfileText) {
			try {
				userProfile = JSON.parse(userProfileText);
			} catch (e) {
				// Ignore if file is invalid.
			}
		}

		userProfile.app = userProfile.app || {};
		userProfile.mods = userProfile.mods || {};
		userProfile.profiles = userProfile.profiles || {
			list: {},
			active: [],
			mergeConfigs: false
		};

		this.userProfile = userProfile;
	}

	public getAppLatestVersion() {
		return this.userProfile.app.latestVersion ?? null;
	}

	public getModRating(modId: string) {
		return this.userProfile.mods[modId]?.rating ?? null;
	}

	public getModVersion(modId: string) {
		return this.userProfile.mods[modId]?.version ?? null;
	}

	public getModLatestVersion(modId: string) {
		return this.userProfile.mods[modId]?.latestVersion ?? null;
	}

	public setModVersion(modId: string, version: string, resetLatestVersion = true) {
		const mod = this.userProfile.mods[modId] || {};

		mod.version = version;
		if (resetLatestVersion) {
			delete mod.latestVersion;
		}

		this.userProfile.mods[modId] = mod;
	}

	public setModDisabled(modId: string, disabled: boolean) {
		const mod = this.userProfile.mods[modId] || {};
		mod.disabled = disabled;
		this.userProfile.mods[modId] = mod;
	}

	public setModRating(modId: string, rating: number) {
		const mod = this.userProfile.mods[modId] || {};
		mod.rating = rating;
		this.userProfile.mods[modId] = mod;
	}

	public deleteMod(modId: string) {
		delete this.userProfile.mods[modId];
	}

	public updateLatestVersions(appLatestVersion?: string, modLatestVersions?: Record<string, string>) {
		let updated = false;

		if (appLatestVersion && this.userProfile.app.latestVersion !== appLatestVersion) {
			this.userProfile.app.latestVersion = appLatestVersion;
			updated = true;
		}

		for (const [modId, latestVersion] of Object.entries(modLatestVersions || {})) {
			const mod = this.userProfile.mods[modId];
			if (mod && mod.latestVersion !== latestVersion) {
				mod.latestVersion = latestVersion;
				updated = true;
			}
		}

		return updated;
	}

	// Profile management methods
	public getProfiles(): Record<string, ConfigProfile> {
		return this.userProfile.profiles?.list || {};
	}

	public getActiveProfiles(): string[] {
		return this.userProfile.profiles?.active || [];
	}

	public isMergeConfigsEnabled(): boolean {
		return this.userProfile.profiles?.mergeConfigs || false;
	}

	public setMergeConfigs(merge: boolean) {
		if (!this.userProfile.profiles) {
			this.userProfile.profiles = { list: {}, active: [], mergeConfigs: false };
		}
		this.userProfile.profiles.mergeConfigs = merge;
	}

	public createProfile(profileId: string, name: string, modConfigs?: Record<string, ProfileModConfig>): boolean {
		if (!this.userProfile.profiles) {
			this.userProfile.profiles = { list: {}, active: [], mergeConfigs: false };
		}

		if (this.userProfile.profiles.list[profileId]) {
			return false; // Profile already exists
		}

		this.userProfile.profiles.list[profileId] = {
			name,
			created: Date.now(),
			mods: modConfigs || {}
		};
		return true;
	}

	public deleteProfile(profileId: string): boolean {
		if (!this.userProfile.profiles?.list[profileId]) {
			return false;
		}

		delete this.userProfile.profiles.list[profileId];
		
		// Remove from active profiles if present
		const activeIndex = this.userProfile.profiles.active.indexOf(profileId);
		if (activeIndex > -1) {
			this.userProfile.profiles.active.splice(activeIndex, 1);
		}

		return true;
	}

	public renameProfile(profileId: string, newName: string): boolean {
		if (!this.userProfile.profiles?.list[profileId]) {
			return false;
		}

		this.userProfile.profiles.list[profileId].name = newName;
		return true;
	}

	public setActiveProfiles(profileIds: string[]): boolean {
		if (!this.userProfile.profiles) {
			this.userProfile.profiles = { list: {}, active: [], mergeConfigs: false };
		}

		// Validate all profile IDs exist
		for (const profileId of profileIds) {
			if (!this.userProfile.profiles.list[profileId]) {
				return false;
			}
		}

		this.userProfile.profiles.active = [...profileIds];
		return true;
	}

	public captureCurrentConfigToProfile(profileId: string, modConfigs: Record<string, any>): boolean {
		if (!this.userProfile.profiles?.list[profileId]) {
			return false;
		}

		this.userProfile.profiles.list[profileId].mods = modConfigs;
		return true;
	}

	public exportProfile(profileId: string): ConfigProfile | null {
		return this.userProfile.profiles?.list[profileId] || null;
	}

	public importProfile(profileId: string, profile: ConfigProfile): boolean {
		if (!this.userProfile.profiles) {
			this.userProfile.profiles = { list: {}, active: [], mergeConfigs: false };
		}

		this.userProfile.profiles.list[profileId] = {
			...profile,
			created: Date.now() // Update creation time on import
		};
		return true;
	}

	public write(asExternalUpdate = false) {
		fs.writeFileSync(this.userProfilePath, JSON.stringify(this.userProfile, null, 2));
		if (!asExternalUpdate) {
			this.onFileModified?.(fs.statSync(this.userProfilePath).mtimeMs);
		}
	}
}

export default class UserProfileUtils {
	private userProfilePath: string;
	private lastModifiedByUserMtimeMs: number | null = null;

	public constructor(appDataPath: string) {
		this.userProfilePath = path.join(appDataPath, 'userprofile.json');
	}

	public getFilePath() {
		return this.userProfilePath;
	}

	public read() {
		return new UserProfile(this.userProfilePath, mtimeMs => {
			this.lastModifiedByUserMtimeMs = mtimeMs;
		});
	}

	public getLastModifiedByUserMtimeMs() {
		return this.lastModifiedByUserMtimeMs;
	}
}
