import childProcess from "child_process";
import fs from "fs";
import path from "path";
import * as github from "@actions/github";
import * as githubActionCore from "@actions/core";

type ActionSource = string;
type ActionTarget = string;

type MessagePayload = {
  color?: string;
  icon?: string;
  message?: string;
  description?: string;
};


function successMessage(source: ActionSource, target: ActionTarget): MessagePayload {
  return {
    color: "#27ae60",
    icon: ":white_check_mark:",
    message: `${source} was successfully merged into ${target}.`,
    description: `*${target}* can be pushed to production!`,
  };
}

function errorMessage(source: ActionSource, target: ActionTarget): MessagePayload {
  return {
    color: "#C0392A",
    icon: ":red_circle:",
    message: `*${source}* has conflict with *${target}*.`,
    description: ":face_with_head_bandage: Fix me please :pray:",
  };
}

function sendSlackMessage(source: ActionSource, target: ActionTarget, status: string): void {
  if (githubActionCore.getInput("webhook_url")) {
    const slack = require('slack-notify')(githubActionCore.getInput('webhook_url'), { required: false });
    let payload =
      status === "success"
        ? successMessage(source, target)
        : errorMessage(source, target);

    slack.send({
      icon_emoji: payload.icon,
      username: payload.message,
      attachments: [
        {
          author_name: github?.context?.payload?.repository?.full_name,
          author_link: `https://github.com/${github?.context?.payload?.repository?.full_name}/`,
          title: payload.message,
          text: payload.description,
          color: payload.color,
          fields: [{ title: "Job Status", value: status, short: false }],
        },
      ],
    });
  }
}

function executeMergeScript(source: ActionSource, target: ActionTarget): Promise<void> {
  const scriptPath = path.resolve(__dirname, "src/merge.sh");
  return new Promise<void>((resolve, reject) => {
    childProcess.exec(
      `"${scriptPath}" ${source} ${target}`,
      function (error, stdout, stderr) {
          if (error) {
            console.log("stdout:", stdout);
            console.log("stderr:", stderr);
          console.error("exec error:", error);
          return reject(error);
        }
        resolve();
      }
    );
  });
}

function createMessageFile() {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile("merge-status.txt", "", (err) => {
      if (err) {
        console.error("Failed to create merge-status.txt:", err);
        return reject(err);
      }
      resolve();
    });
  });
}

function deleteMessageFile() {
  return new Promise<void>((resolve, reject) => {
    fs.unlink("merge-status.txt", (err) => {
      if (err) {
        console.error("Failed to delete merge-status.txt:", err);
        return reject(err);
      } else {
        console.log("merge-status.txt was successfully deleted");
        resolve();
      }
    });
  });
}

async function run() {
  const source = githubActionCore.getInput("source", { required: true });
  const target = githubActionCore.getInput("target", { required: true });
  githubActionCore.info("Merging " + source + " into " + target);
  
  await createMessageFile();

  try {
    await executeMergeScript(source, target);
    const mergeState = fs.readFileSync("merge-status.txt", "utf8").trim();

    if (mergeState === "success") {
      sendSlackMessage(source, target, "success");
      githubActionCore.info("Merging " + source + " into " + target + " succeeded");
    } else {
      sendSlackMessage(source, target, "failure");
      githubActionCore.setFailed(`Failed to merge ${source} into ${target}`);
    }
  } catch (error) {
      sendSlackMessage(source, target, "failure");
      githubActionCore.setFailed(`Failed to merge ${source} into ${target}`);
  } finally {
    await deleteMessageFile();
  }
}

run();
