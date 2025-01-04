{{ TOC }}

JingoRetro is a [fork of the Jingo wiki engine](https://github.org/claudioc/jingo) with some small changes to facilitate compatibility with Browsers Ancien such as Netscape Navigator 3 and Internet Explorer 4. The goal is to provide a dead simple self-hostable platform for hosting notes, documentation, and files, explicitly designed to be accessible from nearly any platform capable of reaching the web. My specific use case is to host a knowledge base of random retro computing information and files, with the thought that if I can update the wiki directly from the machines I'm testing on, it saves me time and effort having to work on the old machine and write up notes on something modern.

## Jingo

Jingo Is Not [GOllum](https://github.com/gollum/gollum), GitHub's git-based Wiki system. Jingo is described by its author as Gollum-compatible, but with additional features so as to make it deployable without Github. The app is built using Git, Express, and Pug, and uses a git repository of Markdown files as its backing "database." This means it is easy to back up and mirror, it is easy to modify offline by editing text files and committing changes, and it should be easy to deploy as a GitHub wiki in the future, should one be so inclined.

## JingoRetro

Jingo is a relatively old application, and is actually capable of working entirely without client-side Javascript. You lose some of the helpful features, but the basic interactions - login, create, and edit - all work just fine without JS. This means that there's very little standing in the way of accessing Jingo from very old browsers. Jingo's default toolbar does not work without JS and CSS3, though, so that was first to go. Then a few more tweaks, primarily to buttons and base font styles was necessary. Before long, the site was functioning in IE4, and before much longer, I'd gotten the basics working in Netscape 3. IE6 works more or less perfectly. 

## Features

 - Article syntax is GitHub-flavored Markdown, stored in plain files for easy manipulation
 - No database - the backing store is a Git repo which tracks all content changes and syncs regularly to a remote server
 - SSO via Google or GitHub (obviously not compatible with retro systems)
 - Standalone authentication via remote LDAP server or local plaintext whitelist
 - Universal compatibility: works [nearly] just as well on IE4 under Windows 3.1 as it does on the latest Chrome or modern iOS

## TODO

 1. First and foremost, needs file upload capability
 2. (maybe) theming, advanced styling