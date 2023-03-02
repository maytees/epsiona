import { Check } from "./checks/check.ts";
import { colors, marky, Notification } from "./deps.ts";
import * as conf from "./config.ts";

export class Engine {
  score = 0;
  maxScore: number;
  checks: Check[];
  completedChecks: Check[] = [];
  allChecks: Check[] = [];
  penalties: Check[] = [];
  checksAmount: number;
  imageName: string = conf.name;

  public constructor(checks: Check[], maxScore: number) {
    this.checksAmount = checks.length;
    this.checks = checks;
    this.allChecks = checks;
    this.maxScore = maxScore;
  }

  // Run checks, then update the scoring report
  public async runEngine() {
    console.log(colors.bold.cyan("Running checks..."));

    for (const check of this.allChecks) {
      await check.runCheck();

      // Is a penalty
      if (this.completedChecks.includes(check) && !check.completed) {
        this.completedChecks.splice(this.completedChecks.indexOf(check), 1);
        this.penalties.push(check);
        this.score -= check.points;

        continue;
      }

      if (
        (check.completed && !this.completedChecks.includes(check)) ||
        (check.completed && this.penalties.includes(check))
      ) {
        this.score += check.points;
        this.completedChecks.push(check);

        if (this.penalties.includes(check)) {
          this.penalties.splice(this.penalties.indexOf(check), 1);
        }

        new Notification({ macos: false, linux: true })
          .title("Fixed vulnerability")
          .body(`Congrats you got ${this.score} points`)
          .icon("config/notif_icon.png")
          .show();
      }
    }

    this.setScoringReport();

    this.completedChecks.forEach((check) =>
      console.log(colors.italic.green(check.completedMessage))
    );

    this.penalties.forEach((check) => {
      console.log(
        colors.bold.red(
          `Penalty - ${check.completedMessage} - -${check.points}`,
        ),
      );
    });

    console.log(
      colors.bold.cyan(
        "Finished running checks! Total points: " + this.score,
      ),
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
