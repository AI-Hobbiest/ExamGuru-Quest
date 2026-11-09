"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const branding=fs.readFileSync("css/branding.css","utf8");
const roleTheme=fs.readFileSync("css/theme-roles-v2.css","utf8");
const nav=fs.readFileSync("js/app-shell.js","utf8");
const studentAuth=fs.readFileSync("js/student-auth.js","utf8");
const css=fs.readFileSync("css/app-shell.css","utf8");
const dashboard=fs.readFileSync("dashboard.html","utf8");
const homepage=fs.readFileSync("index.html","utf8");
const clatLogin=fs.readFileSync("clat-login.html","utf8");
const clatPage=fs.readFileSync("clat.html","utf8");
const clatDashboard=fs.readFileSync("clat-dashboard.html","utf8");
const clatDashboardModel=fs.readFileSync("js/clat-dashboard-model.js","utf8");
const clatDashboardScript=fs.readFileSync("js/clat-dashboard.js","utf8");
const practice=fs.readFileSync("practice.html","utf8");
const profile=fs.readFileSync("profile.html","utf8");
const learning=fs.readFileSync("learning.html","utf8");
const study=fs.readFileSync("study.html","utf8");
const admin=fs.readFileSync("admin.html","utf8");
const science=fs.readFileSync("science.html","utf8");
const parentPage=fs.readFileSync("parent.html","utf8");
const examPractice=fs.readFileSync("exam-practice.html","utf8");
const examPracticeScript=fs.readFileSync("js/exam-paper-self-study.js","utf8");
const parentDashboard=fs.readFileSync("js/parent-dashboard.js","utf8");
const parentAssessments=fs.readFileSync("js/parent-assessments.js","utf8");
const quizEngineSource=fs.readFileSync("js/quiz-engine.js","utf8");
const pageAccess=fs.readFileSync("js/page-access.js","utf8");
assert.ok(parentPage.includes("./js/parent-dashboard.js")&&parentPage.includes("./js/student-auth.js"),"parent workspace loads family identity and dashboard code");
assert.ok(parentDashboard.includes("getLinkedChildren")&&parentDashboard.includes("studentId"),"parent dashboard reads only linked children using student-specific IDs");
assert.ok(parentPage.includes('id="childDetail"')&&parentDashboard.includes("showDetail"),"parent Level 2 provides an individual child progress view");
assert.ok(parentDashboard.includes("Subject performance")&&parentDashboard.includes("Chapter progress")&&parentDashboard.includes("Learning insights"),"parent Level 2 includes subject, chapter and insight sections");
assert.ok(!parentDashboard.includes("MCQs ·")&&!parentDashboard.includes("chapter sets"),
  "parent dashboard does not disclose question-bank size or chapter inventory");
assert.ok(parentDashboard.includes("openReport")&&parentDashboard.includes("C10ReportPrint.open")&&parentDashboard.includes("chartSvg"),"parent Level 3 uses the shared report print flow with charts");
assert.ok(parentPage.includes("./js/report-print.js")&&profile.includes("./js/report-print.js"),"Parent and student profile pages load the shared report print helper");
assert.ok(!parentDashboard.includes("noopener,noreferrer"),"parent report popup does not use a noopener feature that would null the window reference");
assert.ok(parentAssessments.includes("Question bank:")&&parentAssessments.includes("typeCounts")&&parentAssessments.includes("Diagram-based"),"Parent/Teacher paper setup exposes the complete question-bank count by question type");
assert.ok(practice.includes("<span>MCQs in practice bank</span>")&&quizEngineSource.includes('setText("questionTotal",total)'),"students retain only the MCQ practice-bank count");
assert.ok(!examPracticeScript.includes("approved pool records")&&!examPracticeScript.includes("typeSummary")&&!examPracticeScript.includes("bank.questions.length.toLocaleString()"),"student exam setup does not reveal full question-bank inventory");
assert.ok(parentPage.includes("Progress reports"),"parent workspace explains report availability");
assert.ok(pageAccess.includes('session.role==="parent"')&&pageAccess.includes('"./parent.html"'),"student-only routes redirect parent accounts to family workspace");


assert.ok(nav.includes('href:"./dashboard.html"'));
assert.ok(nav.includes('href:"./dashboard.html#rewards"'));
assert.ok(nav.includes('auth:"guest"'),"guest navigation is separated from student navigation");
assert.ok(nav.includes('auth:"admin"'),"admin-only navigation is role gated");
assert.ok(nav.includes('label:"Exam Paper Studio"')&&nav.includes('href:"./admin.html#tab-exam-papers"')&&nav.includes('group:"Assessment tools"'),"admin navigation exposes Exam Paper Studio in a grouped submenu");
assert.ok(nav.includes('auth:"parent"')&&nav.includes('href:"./parent.html"')&&nav.includes('group:"Family"'),"parent navigation is isolated to the Family submenu");
assert.ok(nav.includes('label:"Exam Paper Practice"')&&nav.includes('href:"./exam-practice.html"'),"Class 10 students can open full-paper self-study practice");
assert.ok(nav.includes('classIds:["6","10"]')&&nav.includes('if(item.classIds&&!item.classIds.includes(String(auth.classId||"")))return false;'),
  "Class 6 and Class 10 students see the class-safe Exam Paper Practice entry");
assert.ok(nav.includes('href:"./parent.html#exam-paper-practice"')&&parentPage.includes('id="exam-paper-practice"'),
  "parents have a dedicated Exam Paper Practice guide destination");
assert.ok(examPracticeScript.includes("renderClass6OlympiadHub")&&examPracticeScript.includes("mathematics-sof")&&examPracticeScript.includes("english-sof"),
  "Class 6 Exam Paper Practice opens the three available SOF full-mock subject routes");

assert.ok(parentAssessments.includes("Class 6 · Exam Paper Practice")&&parentAssessments.includes("CBSE full-paper profiles are not published yet"),
  "Class 6 parent child detail explains available SOF mock routes without hiding the section");
assert.ok(nav.includes("await window.C10StudentAuth.restoreSession()"),"navigation resolves the authoritative account class before rendering class-gated links");
assert.ok(!nav.includes('classId||"10"'),"navigation never silently defaults an unknown student class to Class 10");
assert.ok(studentAuth.includes('classId:String(row.classId||"")')&&studentAuth.includes('classId:String(value.classId||"")'),"student identity preserves an explicit class and leaves missing class unknown");
assert.ok(studentAuth.includes("}catch(_){return null;}"),"failed account verification cannot reuse a stale cached student class");
assert.ok(examPracticeScript.includes("return restored&&restored.role===\"student\"?restored:null;")&&!examPracticeScript.includes("currentUser&&window.C10StudentAuth.currentUser()"),"exam page refuses to fall back to an unverified cached class identity");

assert.ok(!nav.includes("36 starter MCQs · 12 chapters"),"student navigation does not disclose Class 6 bank inventory");
const dashboardManager=fs.readFileSync("js/dashboard-manager.js","utf8");
assert.ok(dashboardManager.includes("const mcqCount=bank.reduce")&&dashboardManager.includes('meta.textContent=mcqCount.toLocaleString()+" MCQs available"'),"student dashboard shows the MCQ-only count for every published subject");
assert.ok(!dashboardManager.includes("typeCounts")&&!dashboardManager.includes("Assertion–Reason"),"student dashboard never exposes non-MCQ question-bank inventory");
assert.ok(!dashboardManager.includes('toLocaleString()+" MCQs · "+bank.length+" chapter sets"'),
  "student dashboard never displays question-bank inventory");
assert.ok(!dashboard.includes("Loading bank details…"),"student dashboard does not expose bank inventory loading text");
assert.ok(!examPracticeScript.includes("integrated.stats.appended")&&!examPracticeScript.includes("coverage.slotCount"),
  "student exam setup does not disclose appended bank size or eligible slot inventory");
const profileRegistry=JSON.parse(fs.readFileSync("data/exam-papers/profile-registry.json","utf8"));
assert.ok(profileRegistry.profiles.every(item=>!/([0-9]+ ?(?:candidates|questions)|MCQ bank integrated|paper generation|repeat protection|slot depth)/i.test(item.description||"")),
  "student-visible exam profile descriptions must not disclose bank size or internal pool-readiness metrics");
assert.ok(examPracticeScript.includes('String(item.classId)===studentClassId'),
  "exam practice profiles are filtered to the authenticated student's class");
assert.ok(nav.includes('label:"Exam Paper Studio"')&&nav.includes('href:"./admin.html#tab-exam-papers"'),"admin navigation exposes the authoring studio");
assert.ok(nav.includes('role==="parent"'),"parent sessions are recognised by the shared navigation shell");
assert.ok(nav.includes('c10playground_static_student_v1'),"navigation detects the current student session");
assert.ok(nav.includes('Sign out'),"authenticated navigation provides sign-out");
assert.ok(nav.includes('href:"./profile.html#profile"'));
assert.ok(nav.includes('href:"./profile.html#history"'));
assert.ok(nav.includes('href:"./profile.html#backup"')&&nav.includes('group:"My Account"'));
assert.ok(nav.includes('href:"./study.html"'),"student navigation exposes the Study Library");
assert.ok(nav.includes('href:"./learning.html"'),"student navigation exposes the Learning Hub");
assert.ok(nav.includes('href:"./practice.html?subject=science"')&&nav.includes('group:"Subjects"'),"Science menu opens the shared engine from the Subjects submenu");
assert.ok(homepage.includes('id="studentLoginForm"'),"landing page is the student login screen");
assert.ok(homepage.includes("JP Ganathe"),"the general ExamGuru login retains its original attribution");
assert.ok(clatLogin.includes("AI-Enthusiast")&&!/JP Ganathe|Conceptualised by/i.test(clatLogin),"the dedicated CLAT login uses only AI-Enthusiast attribution");
assert.ok(clatLogin.includes('id="studentLoginForm"')&&clatLogin.includes("login-page.js"),"the CLAT login reuses the existing student authentication flow");
assert.ok(clatPage.includes("AI-Enthusiast")&&!/JP Ganathe|Conceptualised by/i.test(clatPage),"the CLAT practice page contains no personal attribution");
assert.ok(nav.includes('current.file==="clat-login.html"')&&nav.includes('location.replace(clatExperience?"./clat-login.html":"./index.html")'),"CLAT guests and sign-outs remain within the separate CLAT entry route");
assert.ok(nav.includes('clatExperience?"AI-Enthusiast":"Learn · Practise · Level up"')&&nav.includes('clatExperience?"AI-Enthusiast · CLAT UG 2027"'),"desktop and mobile CLAT navigation display the abstracted brand");
assert.ok(pageAccess.includes('page==="clat.html"?"./clat-login.html":"./index.html"'),"unauthenticated CLAT visitors are routed to the CLAT-specific login page");
assert.ok(homepage.includes('id="adminLoginForm"'),"landing page offers the temporary admin username/password form");
assert.ok(homepage.includes('login-page.js'),"landing page loads the login flow");
assert.ok(homepage.includes('Sign in as administrator'),"admin sign-in has a clear submit action");
assert.ok(dashboard.includes('id="subjects"')&&dashboard.includes('practice.html?subject=science'),"dashboard contains subject launch cards");
assert.ok(nav.includes("aria-expanded")&&nav.includes("c10-nav-group-trigger")&&nav.includes("c10-nav-submenu"),"sidebar groups use accessible expandable submenu controls");
assert.ok(nav.includes('event.key==="Escape"'));
assert.ok(nav.includes('const file=last.includes(".")?last:"index.html"'),"GitHub Pages project root resolves as index");
assert.ok(css.includes("@media(max-width:1100px)"),"tablet-sized viewports use the compact slide-in menu");
const deployWorkflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert.ok(deployWorkflow.includes("cp clat-login.html _site/clat-login.html"),"Pages packaging includes the dedicated CLAT login page");
assert.ok(deployWorkflow.includes("cp css/theme-roles-v2.css _site/css/theme-roles-v2.css"),"Pages packaging includes the role stylesheet");
assert.ok(deployWorkflow.includes("'css/theme-roles-v2.css'"),"deployed asset validation includes the role stylesheet");
assert.ok(roleTheme.includes("body.c10-theme-quest"),"student-facing pages have a dedicated Quest theme");
assert.ok(roleTheme.includes("body.c10-theme-admin"),"Admin Workspace has a dedicated Lavender theme");
assert.ok(roleTheme.includes("#f0a82e"),"Quest quiz primary action uses the yellow-orange accent");
assert.ok(roleTheme.includes("#e4f4e7")&&roleTheme.includes("#eee9ff")&&roleTheme.includes("#fff0c8"),"Quest palette includes green, lavender and yellow");
for(const [name,html,theme] of [["homepage",homepage,"c10-theme-quest"],["practice",practice,"c10-theme-quest"],["profile",profile,"c10-theme-quest"],["dashboard",dashboard,"c10-theme-quest"],["learning",learning,"c10-theme-quest"],["study",study,"c10-theme-quest"],["admin",admin,"c10-theme-admin"]]){
 assert.ok(/\.\/css\/theme-roles-v2\.css\?v=quest\d+/.test(html),name+" loads a versioned role-specific theme");
 assert.ok(html.includes('class="'+theme)||html.includes('class="eg-quiz-page '+theme),name+" is assigned the correct theme");
}
assert.ok(css.includes(".c10-sidebar a.c10-nav-link:visited"),"sidebar link color overrides the global anchor theme");
assert.ok(css.includes(".c10-sidebar a.c10-nav-link.active:visited"),"active link remains readable on the dark sidebar");
assert.ok(css.includes(".c10-sidebar.open"));
assert.ok(css.includes("Persistent ExamGuru top bar")&&css.includes("position:fixed;inset:0 0 auto var(--c10-sidebar-width)")&&css.includes(".c10-mobilebar{left:0"),"branded top bar remains fixed across desktop, tablet and mobile");
assert.ok(nav.includes("c10-topbar-brand")&&nav.includes("c10HeaderSignout")&&nav.includes("mobileBar.appendChild(logout)"),"persistent top bar includes branding and role-aware sign-out");
assert.ok(css.includes(".c10-nav-scrim.visible"));
assert.ok(css.includes("prefers-reduced-motion"));
for(const [name,html] of [["homepage",homepage],["practice",practice],["profile",profile],["learning",learning],["study",study]]) {
 assert.ok(html.includes("./css/app-shell.css"),name+" links shared navigation styles");
 assert.ok(html.includes("./js/app-shell.js"),name+" loads shared navigation behavior");
}
assert.ok(science.includes("practice.html?subject=science"),"Science compatibility page routes to the shared practice engine");
assert.ok(science.includes("window.location.replace"),"Science redirects promptly instead of loading the retired standalone module");
assert.ok(dashboard.includes("./css/app-shell.css"));
assert.ok(dashboard.includes("./js/app-shell.js"));
assert.ok(dashboard.includes("level-orb")&&dashboard.includes("transform:none"),"dashboard level badge square uses a centred, unrotated layout");
assert.ok(dashboard.includes("./js/page-access.js"),"dashboard loads the sign-in guard");
assert.ok(dashboard.includes("./js/student-auth.js"),"dashboard can validate the published student account");
for(const section of ["dashboard","rewards"])assert.ok(dashboard.includes('id="'+section+'"'));
for(const field of ["profile","history","backup"])assert.ok(profile.includes('id="'+field+'"'));
assert.ok(learning.includes('id="mistakes"')&&learning.includes('id="bookmarkList"')&&learning.includes('id="topicMasteryList"'),"Learning Hub exposes the Mistake Book, bookmarks and topic mastery");
assert.ok(learning.includes("./js/learning-model.js")&&learning.includes("./js/learning-center.js"),"Learning Hub loads its data model and rendering controller");
assert.ok(study.includes('id="studyResourceList"')&&study.includes("./js/study-model.js")&&study.includes("./js/study-library.js"),"Study Library displays published learning resources");
assert.ok(dashboard.includes('href="./study.html"'),"dashboard links to the Study Library");
assert.ok(nav.includes('group:"My Learning"')&&nav.includes('group:"Study Pack"'),"Study Library and Learning Hub are grouped under their learning destinations");
const loginScript=fs.readFileSync("js/login-page.js","utf8");
const accessScript=fs.readFileSync("js/page-access.js","utf8");
assert.ok(loginScript.includes("C10StudentAuth.login"),"login form authenticates student accounts");
assert.ok(loginScript.includes("ADMIN_PASSWORD_SHA256") && loginScript.includes("crypto.subtle.digest"),"temporary admin login checks the configured password hash");
assert.ok(accessScript.includes('location.replace("./index.html")'),"unsigned dashboard visits return to login");

assert.equal((nav.match(/label:"Assessment Test"/g)||[]).length,1,"student navigation defines the Assessment Test submenu only once");
assert.ok(nav.includes('clatHref:"./clat.html#library"')&&nav.includes('clatPage:"clat.html"'),"the single Assessment Test entry routes CLAT students to their model-paper library");
assert.ok(nav.includes('label:"CLAT UG 2027",group:"Entrance Exams"')&&nav.includes('classIds:["CLAT"]'),"the working CLAT paper library is restricted to CLAT accounts");
assert.ok(nav.includes('disabled:true,status:"Coming soon",classIds:["10"]'),"Class 10 entrance-exam items are disabled placeholders without sample-paper links");
for(const exam of ["JEE Main & Advanced","NEET UG","CUET UG","NDA (10+2)","IPMAT"])assert.ok(nav.includes('label:"'+exam+'"'),"Class 10 Entrance Exams includes "+exam);
assert.ok(nav.includes('isClatStudent&&!["CLAT UG 2027","Assessment Test","Study Library","Learning Hub","FAQ & Guide"]'),"CLAT students receive the Assessment, Study Pack and Learning Hub navigation");
assert.ok(nav.includes("applyClatAttribution")&&nav.includes("AI-Enthusiast"),"shared learning pages replace the personal attribution for CLAT students");
assert.ok(css.includes(".c10-nav-link.is-disabled")&&css.includes(".c10-nav-link-status"),"Coming soon entrance-exam entries are visibly non-interactive");
assert.ok(nav.includes('clatHref:"./clat-dashboard.html"')&&nav.includes('clatPage:"clat-dashboard.html"'),"CLAT students have a dedicated dashboard destination");
assert.ok(nav.includes('["CLAT UG 2027","Dashboard","Assessment Test","Study Library","Learning Hub","FAQ & Guide"]'),"CLAT navigation exposes the dashboard, assessment, study pack and learning hub");
assert.ok(loginScript.includes("./clat-dashboard.html"),"CLAT sign-in and restored sessions land on the CLAT dashboard");
assert.ok(accessScript.includes('page==="clat-dashboard.html"')&&accessScript.includes('toUpperCase()!=="CLAT"'),"CLAT dashboard route is restricted to verified CLAT students");
assert.ok(clatDashboard.includes('name="author" content="AI-Enthusiast"')&&!/JP Ganathe|Conceptualised by/i.test(clatDashboard),"CLAT dashboard uses abstracted AI-Enthusiast branding");
for(const field of ["totalXp","levelValue","papersCompleted","streakValue","bestAccuracy","scoreTrend","sectionStrength","recentAttemptList","badgeList"])assert.ok(clatDashboard.includes('id="'+field+'"'),"CLAT dashboard includes "+field);
assert.ok(clatDashboard.includes("./js/clat-dashboard-model.js")&&clatDashboard.includes("./js/clat-dashboard.js"),"CLAT dashboard loads its progress model and renderer");
assert.ok(clatDashboardModel.includes("function xpFor")&&clatDashboardModel.includes("function levelFor")&&clatDashboardModel.includes("sectionStats"),"CLAT XP, levels and section performance are derived from submitted CLAT attempts");
new Function(nav);new Function(loginScript);new Function(accessScript);new Function(clatDashboardModel);new Function(clatDashboardScript);
console.log("Navigation/login tests passed: responsive sidebar, role-aware links, login form, temporary admin login, dashboard guard, subject launch cards, Science redirect, keyboard closing and profile anchors.");

assert.ok(examPractice.includes("./js/exam-paper-generator.js")&&examPractice.includes("./js/exam-paper-self-study.js"),"self-study exam page loads generator and attempt controller");
assert.ok(examPracticeScript.includes("startTimer")&&examPracticeScript.includes("submit")&&examPracticeScript.includes("eg_exam_last_result_v1"),"self-study exam supports timed attempts, submission and local result storage");
