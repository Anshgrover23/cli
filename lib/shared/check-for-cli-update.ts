import ky from "ky"
import { getPackageManager } from "./get-package-manager"
import { getGlobalDepsInstallCommand } from "lib/shared/get-dep-install-command"
import readline from "node:readline"
import { execSync } from "node:child_process"
import { program } from "cli/main"
import semver from "semver"
import { version as pkgVersion } from "../../package.json"
import kleur from "kleur"

export const currentCliVersion = () =>
  program?.version() ?? semver.inc(pkgVersion, "patch") ?? pkgVersion

export const checkForTsciUpdates = async () => {
  if (process.env.TSCI_SKIP_CLI_UPDATE === "true") return
  const { version: latestCliVersion } = await ky
    .get<{ version: string }>(
      "https://registry.npmjs.org/@tscircuit/cli/latest",
      { throwHttpErrors: false },
    )
    .json()

  if (latestCliVersion && semver.gt(latestCliVersion, currentCliVersion())) {
    const userWantsToUpdate = await askConfirmation(
      `A new version of tsci is available (${currentCliVersion()} → ${latestCliVersion}).\nWould you like to update now?`,
    )
    if (userWantsToUpdate) {
      const packageManager = getPackageManager()
      const installCommand = getGlobalDepsInstallCommand(
        packageManager.name,
        "@tscircuit/cli@latest",
      )
      try {
        console.log(`Updating tsci using: ${installCommand}`)
        execSync(installCommand, { stdio: "inherit" })
        console.log(kleur.green("tsci has been updated successfully!"))
      } catch {
        console.warn("Update failed. You can try updating manually by running:")
        console.warn(`  ${installCommand}`)
      }
    }
  } else {
    return false
  }
  return true
}

export const askConfirmation = (question: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const timeout = setTimeout(() => {
      rl.close()
      resolve(false)
    }, 5000)

    rl.question(`${question} (y/n): `, (answer) => {
      clearTimeout(timeout)
      rl.close()
      const normalized = answer.trim().toLowerCase()
      resolve(normalized === "yes" || normalized === "y")
    })
  })
}
