import { Check } from "./checks/check.ts";
import { colors, marky, Notification } from "./deps.ts";
import * as conf from "./config.ts";

export class Engine {
  score = 0;
  maxScore: number;
  checks: Check[];
  completedChecks: Check[] = [];
  checksAmount: number;
  imageName: string = conf.name;

  public constructor(checks: Check[], maxScore: number) {
    this.checksAmount = checks.length;
    this.checks = checks;
    this.maxScore = maxScore;
  }

  // Run checks, then update the scoring report
  public async runEngine() {
    console.log(colors.bold.cyan("Running checks..."));

    for (const check of this.checks) {
      await check.runCheck();
      if (check.completed) {
        if (!this.completedChecks.includes(check)) {
          this.score += check.points;
          this.completedChecks.push(check);

          // Check complete notification & sound
          new Notification({ macos: false, linux: true })
            .title("Vulnerability fixed")
            .body("Congrats! You fixed something")
            .icon("config/notif_icon.png")
            .show();
        }
      }
    }
    this.checks = this.checks.filter((check) => !check.completed);

    this.setScoringReport();

    this.completedChecks.forEach((check) =>
      console.log(colors.italic.green(check.completedMessage))
    );
    console.log(
      colors.bold.cyan("Finished running checks! Total points: " + this.score),
    );
  }

  // Gets completed checks, creates/updates the scoring report
  private setScoringReport() {
    let completedChecksStr = "";
    for (const completedCheck of this.completedChecks) {
      completedChecksStr +=
        `•${completedCheck.completedMessage} - ${completedCheck.points}\n\n`;
    }

    const mdScoringReport =
      `# ${this.imageName}\n\n\n### Gained a total of ${this.score} out of ${this.maxScore} points` +
      `${" "}recieved\n\n### ${this.completedChecks.length} out of ${this.checksAmount} vulnerabilities ` +
      `solved for a total of ${this.score} points:\n\n${completedChecksStr}`;

    const autoRefreshScript = `
    <script>
      function autoRefresh() {
          window.location = window.location.href;
      }
      setInterval('autoRefresh()', ${conf.auto_refresh});
    </script>`;

    const scoreReportPage: string = marky(mdScoringReport) + autoRefreshScript;

    Deno.writeTextFileSync(
      conf.auto_export
        ? conf.auto_export_path + "/ScoringReport.html"
        : conf.export_folder + "/ScoringReport.html",
      scoreReportPage,
    );
  }
}
