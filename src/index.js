
const childProcess = require('child_process');
const fs = require('fs');
const github = require('@actions/github');
const githubActionCore = require('@actions/core');
const slack = require('slack-notify')(githubActionCore.getInput('webhook_url', { required: false }));


function successMessage(source, target) {
    return {
        color: "#27ae60",
        icon: ":white_check_mark:",
        message: `${source} was successfully merged into ${target}.`,
        description: `*${target}* can be pushed to production!`
    };
}

function errorMessage(source, target) {
    return {
        color: "#C0392A",
        icon: ":red_circle:",
        message: `*${source}* has conflict with *${target}*.`,
        description: ":face_with_head_bandage: Fix me please :pray:"
    };
}

function sendSlackMessage(source, target, status) {
    let payload = status === 'success' ?
                  successMessage(source, target) :
                  errorMessage(source, target);

    slack.send({
        icon_emoji: payload.icon,
        username: payload.message,
        attachments: [
            {
                author_name: github.context.payload.repository.full_name,
                author_link: `https://github.com/${github.context.payload.repository.full_name}/`,
                title: payload.message,
                text: payload.description,
                color: payload.color,
                fields: [
                    { title: 'Job Status', value: status, short: false },
                ],
            },
        ],
    });
}

function executeMergeScript(source, target) {
    return new Promise((resolve, reject) => {
        childProcess.exec(`src/merge.sh ${source} ${target}`, function(error, stdout, stderr) {
            console.log('stdout:', stdout);
            console.log('stderr:', stderr);
            if (error) {
                console.error('exec error:', error);
                return reject(error);
            }
            resolve();
        });
    });
}

async function run() {
    const source = githubActionCore.getInput('source', { required: true });
    const target = githubActionCore.getInput('target', { required: true });
    githubActionCore.info('Merging ' + source + ' into ' + target);
    try {
        await executeMergeScript(source, target);
        const mergeState = fs.readFileSync('merge-status.txt', 'utf8').trim();

        if (mergeState === 'success') {
            sendSlackMessage(source, target, 'success');
        } else {
            sendSlackMessage(source, target, 'failure');
            githubActionCore.setFailed(`Failed to merge ${source} into ${target}`);
        }
    } 
    
    catch (error) {
        sendSlackMessage(source, target, 'failure');
        githubActionCore.setFailed(`Failed to merge ${source} into ${target}`);
    } 
    
    finally {
        fs.unlink('merge-status.txt', (err) => {
            if (err) {
                console.error('Failed to delete merge-status.txt:', err);
            } else {
                console.log('merge-status.txt was successfully deleted');
            }
        });
    }
}

run();
