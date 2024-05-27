import { dialog, ipcMain } from "electron"
import fs from "fs"
import path from "path"

export function initIpcHandlers() {
  ipcMain.handle("open-directory-dialog", async event => {
    const { filePaths } = await dialog.showOpenDialog({ properties: ["openDirectory"] })
    return filePaths[0] // Return the selected directory path
  })

  ipcMain.handle("set-active-profile", (event, profilesDir, profileName) => {
    const activeProfilePath = path.join(profilesDir, "active_profile.json")

    const profileData = { activeProfile: profileName }
    fs.writeFileSync(activeProfilePath, JSON.stringify(profileData, null, 2))
  })

  ipcMain.handle("get-active-profile", async (event, profilesDir) => {
    const activeProfilePath = path.join(profilesDir, "active_profile.json")

    if (fs.existsSync(activeProfilePath)) {
      const data = fs.readFileSync(activeProfilePath, "utf8")
      return JSON.parse(data).activeProfile // Retrieve the active profile from JSON
    }
    return "" // Return an empty string if the file does not exist
  })

  ipcMain.handle("get-profiles", async (event, sptInstallDir: string) => {
    try {
      const profilesDir = path.join(sptInstallDir, "spt_mod_profiles")
      // Create profiles directory if it doesn't exist
      if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir)
      }

      const directories = fs
        .readdirSync(profilesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
      return directories
    } catch (error) {
      console.error("Failed to get profiles:", error)
      return [] // Return an empty array in case of an error
    }
  })

  ipcMain.handle("create-profile", async (event, sptInstallDir: string, profileName: string) => {
    const baseDir = path.join(sptInstallDir, "spt_mod_profiles", profileName)

    const masterConfigFile = path.join(sptInstallDir, "BepInEx", "config", "BepInEx.cfg")
    const masterPluginsDir = path.join(sptInstallDir, "BepInEx", "plugins", "spt")

    const directories = [
      path.join(baseDir, "user", "cache"),
      path.join(baseDir, "user", "launcher"),
      path.join(baseDir, "user", "logs"),
      path.join(baseDir, "user", "mods"),
      path.join(baseDir, "user", "profiles"),
      path.join(baseDir, "user", "sptsettings"),

      path.join(baseDir, "BepInEx", "config"),
      path.join(baseDir, "BepInEx", "plugins"),
    ]

    // Create directories if they don't exist
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })

    // Copy the master configuration file
    const targetConfigFile = path.join(baseDir, "BepInEx", "config", "BepInEx.cfg")
    fs.copyFileSync(masterConfigFile, targetConfigFile)

    // Function to recursively copy directories
    const copyDirectory = (src: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true })
      let entries = fs.readdirSync(src, { withFileTypes: true })

      for (let entry of entries) {
        let srcPath = path.join(src, entry.name)
        let destPath = path.join(dest, entry.name)

        entry.isDirectory() ? copyDirectory(srcPath, destPath) : fs.copyFileSync(srcPath, destPath)
      }
    }

    // Copy the plugins directory
    const targetPluginsDir = path.join(baseDir, "BepInEx", "plugins", "spt")
    copyDirectory(masterPluginsDir, targetPluginsDir)
  })

  ipcMain.handle("activate-profile", async (event, sptInstallDir: string, profileName: string) => {
    const gameDir = sptInstallDir
    const profileDir = path.join(gameDir, "spt_mod_profiles", profileName)

    try {
      const linkDirs = [
        { src: "user", dest: "user" },
        { src: path.join("BepInEx", "config"), dest: path.join("BepInEx", "config") },
        { src: path.join("BepInEx", "plugins"), dest: path.join("BepInEx", "plugins") },
      ]

      // Remove existing symlinks
      linkDirs.forEach(({ dest }) => {
        const fullDestPath = path.join(gameDir, dest)
        if (fs.existsSync(fullDestPath)) {
          // Remove directories or files; here we assume directories
          fs.rmSync(fullDestPath, { recursive: true, force: true })
        }
      })

      // Create new symlinks
      linkDirs.forEach(({ src, dest }) => {
        const fullSrcPath = path.join(profileDir, src)
        const fullDestPath = path.join(gameDir, dest)
        fs.symlinkSync(fullSrcPath, fullDestPath, "junction") // 'junction' is for directories on Windows
      })

      return true // Indicate successful activation
    } catch (error) {
      console.error("Failed to activate profile:", error)
      return false // Indicate an error
    }
  })
}
