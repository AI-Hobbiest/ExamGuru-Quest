/* M5.4–M5.6 integration services. Provider-neutral; local-first; no cloud activation. */
(() => {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const rows = value => Array.isArray(value) ? value : [];
  const text = value => String(value == null ? "" : value);
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function buildLearningReport(input) {
    const data = input || {};
    const attempts = rows(data.attempts);
    const answers = rows(data.answerRecords);
    const mistakes = rows(data.mistakes);
    const bookmarks = rows(data.bookmarks);
    const mastery = rows(data.mastery);
    const progress = rows(data.progress);
    const attemptById = new Map(attempts.map(row => [text(row.attemptId), row]));
    const subjects = new Map();
    const ensure = id => {
      const key = text(id || "unclassified");
      if (!subjects.has(key)) subjects.set(key, {
        subjectId:key, attemptCount:0, submittedCount:0, timedOutCount:0,
        questionCount:0, answeredCount:0, correctCount:0, skippedCount:0,
        scoreTotal:0, maxScoreTotal:0, mistakeCount:0, bookmarkCount:0,
        masteryCount:0, progressAnsweredCount:0, progressCorrectCount:0, progressMissedCount:0, bankIds:[]
      });
      return subjects.get(key);
    };
    const bankIds = new Map();
    const addBank = (subjectId, value) => {
      const id = text(value).trim();
      if (!id) return;
      if (!bankIds.has(text(subjectId))) bankIds.set(text(subjectId), new Set());
      bankIds.get(text(subjectId)).add(id);
    };
    for (const attempt of attempts) {
      const subject = text(attempt.subjectId || "unclassified"), row = ensure(subject);
      row.attemptCount++;
      if (attempt.status === "submitted") row.submittedCount++;
      if (attempt.status === "timed-out") row.timedOutCount++;
      row.questionCount += number(attempt.questionCount);
      row.scoreTotal += number(attempt.score);
      row.maxScoreTotal += number(attempt.maxScore);
      addBank(subject, attempt.source && attempt.source.sourceId);
      addBank(subject, attempt.questionBankId);
    }
    const answersByAttempt = new Map();
    for (const answer of answers) {
      const attempt = attemptById.get(text(answer.attemptId));
      const subjectId = text(answer.subjectId || attempt && attempt.subjectId || "unclassified");
      const row = ensure(subjectId);
      const key = text(answer.attemptId);
      if (!answersByAttempt.has(key)) answersByAttempt.set(key, []);
      answersByAttempt.get(key).push(answer);
      if (answer.status === "answered") {
        row.answeredCount++;
        if (answer.isCorrect === true) row.correctCount++;
      } else if (answer.status === "skipped") row.skippedCount++;
      addBank(subjectId, answer.source && answer.source.sourceId);
      addBank(subjectId, answer.questionBankId);
    }
    // For attempts without answer-ledger rows, retain their recorded counters.
    for (const attempt of attempts) {
      if (answersByAttempt.has(text(attempt.attemptId))) continue;
      const row = ensure(attempt.subjectId);
      row.answeredCount += number(attempt.answeredCount);
      row.correctCount += number(attempt.correctCount);
      row.skippedCount += number(attempt.skippedCount);
    }
    for (const item of mistakes) {
      const subjectId = text(item.subjectId || "unclassified");
      ensure(subjectId).mistakeCount++;
      addBank(subjectId, item.bankId || item.sourceBankId);
    }
    for (const item of bookmarks) {
      const subjectId = text(item.subjectId || "unclassified");
      ensure(subjectId).bookmarkCount++;
      addBank(subjectId, item.bankId || item.sourceBankId);
    }
    for (const item of mastery) {
      const subjectId = text(item.subjectId || "unclassified");
      ensure(subjectId).masteryCount++;
      addBank(subjectId, item.bankId || item.sourceBankId);
    }
    for (const item of progress) {
      const subjectId = text(item.subjectId || "unclassified");
      const row=ensure(subjectId);
      row.progressAnsweredCount+=number(item.answered);
      row.progressCorrectCount+=number(item.correct);
      row.progressMissedCount+=number(item.missedCount != null ? item.missedCount : rows(item.missed).length);
      addBank(subjectId, item.bankId || item.sourceBankId);
    }
    for (const [subjectId, ids] of bankIds) ensure(subjectId).bankIds = Array.from(ids).sort();
    const bySubject = Array.from(subjects.values()).sort((a,b)=>a.subjectId.localeCompare(b.subjectId));
    const total = bySubject.reduce((acc,row)=>{
      for (const key of ["attemptCount","submittedCount","timedOutCount","questionCount","answeredCount","correctCount","skippedCount","scoreTotal","maxScoreTotal","mistakeCount","bookmarkCount","masteryCount","progressAnsweredCount","progressCorrectCount","progressMissedCount"]) acc[key]+=row[key];
      return acc;
    },{attemptCount:0,submittedCount:0,timedOutCount:0,questionCount:0,answeredCount:0,correctCount:0,skippedCount:0,scoreTotal:0,maxScoreTotal:0,mistakeCount:0,bookmarkCount:0,masteryCount:0,progressAnsweredCount:0,progressCorrectCount:0,progressMissedCount:0});
    return {
      schemaVersion:1, kind:"examguru-learning-report", generatedAt:data.generatedAt || new Date().toISOString(),
      studentId:text(data.studentId), bySubject, totals:total,
      bankIds:Array.from(new Set(bySubject.flatMap(row=>row.bankIds))).sort()
    };
  }

  function toCsv(report) {
    if (!report || report.kind !== "examguru-learning-report" || !Array.isArray(report.bySubject)) {
      throw new TypeError("A learning report is required for CSV export.");
    }
    const columns=["subjectId","attemptCount","submittedCount","timedOutCount","questionCount","answeredCount","correctCount","skippedCount","scoreTotal","maxScoreTotal","mistakeCount","bookmarkCount","masteryCount","progressAnsweredCount","progressCorrectCount","progressMissedCount","bankIds"];
    const cell=value=>'"'+text(Array.isArray(value)?value.join(";"):value).replace(/"/g,'""')+'"';
    return [columns.join(","),...report.bySubject.map(row=>columns.map(key=>cell(row[key])).join(","))].join("\r\n");
  }

  function createLocalLearningRecordsReader(options) {
    const opts=options||{}, storage=opts.storage||globalThis.C10Storage;
    if(!storage || typeof storage.createLocalStore!=="function") throw new TypeError("C10Storage is required.");
    const banks=rows(opts.banks);
    if(!banks.length) throw new TypeError("The active class bank catalogue is required.");
    return async function loadLocalRecords(scope) {
      const requested=scope||{}, profileId=text(requested.profileId||opts.profileId);
      const attempts=[], answerRecords=[], progress=[];
      for(const bank of banks) {
        if(!bank || !bank.id || !bank.subjectId) continue;
        const ledger=storage.createLocalStore({kind:"test-attempt-ledger",recordId:String(bank.id),
          defaults:()=>({attempts:[],activeAttempt:null,answerRecords:[]}),
          validate:value=>!!value&&Array.isArray(value.attempts)&&Array.isArray(value.answerRecords)&&
            (value.activeAttempt===null||typeof value.activeAttempt==="object")}).load();
        const visible=(ledger.attempts||[]).filter(row=>!profileId || !row.profileId || row.profileId===profileId);
        const ids=new Set(visible.map(row=>text(row.attemptId)));
        visible.forEach(row=>attempts.push({...clone(row),subjectId:row.subjectId||bank.subjectId,
          subjectTitle:row.subjectTitle||bank.title,questionBankId:bank.id}));
        (ledger.answerRecords||[]).filter(row=>ids.has(text(row.attemptId))).forEach(row=>
          answerRecords.push({...clone(row),subjectId:row.subjectId||bank.subjectId,questionBankId:bank.id}));
        const p=storage.createLocalStore({kind:"subject-progress",recordId:String(bank.id),
          defaults:()=>({missed:[],answered:0,correct:0,attempts:[]}),
          validate:value=>!!value&&Array.isArray(value.missed)&&Number.isFinite(value.answered)&&
            Number.isFinite(value.correct)&&Array.isArray(value.attempts)}).load();
        progress.push({subjectId:bank.subjectId,bankId:bank.id,answered:number(p.answered),correct:number(p.correct),missedCount:rows(p.missed).length});
      }
      const library=storage.createLocalStore({kind:"learning-library",recordId:"class-"+text(requested.classId||opts.classId||"10"),
        defaults:()=>({schemaVersion:1,kind:"learning-library",mistakes:[],bookmarks:[],responses:[]}),
        validate:value=>!!value&&value.schemaVersion===1&&value.kind==="learning-library"&&
          Array.isArray(value.mistakes)&&Array.isArray(value.bookmarks)&&Array.isArray(value.responses)}).load();
      const learning=opts.learningModel||globalThis.C10LearningModel;
      const mastery=learning&&typeof learning.summarizeTopics==="function"?learning.summarizeTopics(library):[];
      return {studentId:text(requested.studentId),attempts,answerRecords,mistakes:clone(library.mistakes),
        bookmarks:clone(library.bookmarks),mastery:clone(mastery),progress,generatedAt:new Date().toISOString()};
    };
  }

  function createLearningRecordsService(options) {
    const opts=options||{};
    if(typeof opts.loadRecords!=="function") throw new TypeError("A local learning-record reader is required.");
    if(typeof opts.authorize!=="function") throw new TypeError("An authorization policy is required.");
    async function read(actor, scope) {
      const requested=scope||{};
      const decision=await opts.authorize(actor,"report.student.read",clone(requested));
      if(!decision || decision.allowed!==true) {
        const error=new Error("Learning records are not available for this scope.");
        error.code=decision && decision.reason || "scope-denied";
        throw error;
      }
      if(!requested.studentId) throw new TypeError("A student scope is required.");
      const records=await opts.loadRecords(clone(requested));
      return buildLearningReport({...records,studentId:requested.studentId});
    }
    return Object.freeze({readStudentReport:read,exportStudentCsv:async(actor,scope)=>toCsv(await read(actor,scope)),
      exportStudentJson:async(actor,scope)=>JSON.stringify(await read(actor,scope),null,2)});
  }

  const ROLE_KEYS=Object.freeze(["platform_admin","school_admin","teacher","parent","student","institution_viewer"]);
  function createRoleExperiencePolicy(options) {
    const opts=options||{};
    const experience=opts.experience || globalThis.ExamGuruRoleExperience;
    const academic=opts.academicOrganisation || globalThis.ExamGuruAcademicOrganisation;
    const serverAuthorize=opts.serverAuthorize;
    function describeMemberships(memberships, appointments, at, platformRoles) {
      const time=at || new Date().toISOString(), result=[];
      for(const role of rows(platformRoles)) if(role && role.role==="platform_admin" && !role.revokedAt) {
        result.push({role:"platform_admin",membershipId:null,institutionId:null,scope:"platform-role"});
      }
      for(const membership of rows(memberships)) {
        if(!membership || membership.status!=="active" || !ROLE_KEYS.includes(membership.role)) continue;
        result.push({role:membership.role,membershipId:membership.membershipId||null,institutionId:membership.institutionId||null,scope:"membership"});
        if(membership.role==="teacher" && academic && typeof academic.isDepartmentHead==="function") {
          for(const appointment of rows(appointments)) {
            if(!appointment || appointment.status!=="active") continue;
            const departmentMembershipId=appointment.departmentMembershipId || appointment.teacherMembershipId;
            if(departmentMembershipId && membership.membershipId && departmentMembershipId!==membership.membershipId) continue;
            if(academic.isDepartmentHead([appointment],appointment.departmentId,appointment.scopeAllDepartmentClasses?null:(rows(appointment.classIds)[0]||""),time)) {
              result.push({role:"hod",baseRole:"teacher",membershipId:membership.membershipId||null,
                institutionId:membership.institutionId||null,departmentId:appointment.departmentId,classIds:clone(rows(appointment.classIds)),
                effectiveFrom:appointment.effectiveFrom||null,effectiveTo:appointment.effectiveTo||null,
                appointmentId:appointment.appointmentId||null,scope:"effective-dated-appointment"});
            }
          }
        }
      }
      return result;
    }
    function navigation(role) {
      if(role==="hod") role="teacher";
      const item=experience && experience.roles && experience.roles[role];
      return item ? clone(item.nav) : [];
    }
    async function authorizeAction(actor, permission, scope) {
      // Client-side role previews are never authorization. Without a server-backed
      // decision provider every protected action is denied by default.
      if(typeof serverAuthorize!=="function") return {allowed:false,reason:"server-authorization-unavailable",mode:"local-preview-only"};
      const result=await serverAuthorize(actor,permission,clone(scope||{}));
      return result && result.allowed===true
        ? {...result,mode:"server-authorized"}
        : {allowed:false,reason:result && result.reason || "scope-denied",mode:"server-authorized"};
    }
    return Object.freeze({roles:ROLE_KEYS,describeMemberships,navigation,authorizeAction,
      previewOnly:true,serverAuthorizationConfigured:typeof serverAuthorize==="function"});
  }

  const ADAPTER_METHODS=Object.freeze(["getRecord","listRecords","upsertRecord"]);
  function assertRecordAdapter(adapter, assurance) {
    if(!adapter || ADAPTER_METHODS.some(name=>typeof adapter[name]!=="function")) {
      throw new TypeError("Record adapter must implement getRecord, listRecords and upsertRecord.");
    }
    return Object.freeze({adapter,assurance:assurance||"unverified",methods:ADAPTER_METHODS.slice()});
  }
  function createLocalRecordAdapter(storage) {
    if(!storage || typeof storage.createLocalStore!=="function") throw new TypeError("C10Storage local adapter is required.");
    const storeFor=(kind,recordId)=>storage.createLocalStore({
      kind:"m5-record-"+String(kind),recordId:String(recordId),studentId:"",
      defaults:()=>null,validate:value=>value===null || (value&&typeof value==="object")
    });
    return Object.freeze({
      assurance:"local-browser-only",
      async getRecord({kind,recordId}) {
        const data=storeFor(kind,recordId).load();
        return data===null?null:clone(data);
      },
      async listRecords({kind,recordIds}) {
        if(!Array.isArray(recordIds)) throw new TypeError("Local listing requires explicit recordIds.");
        const result=[];
        for(const recordId of recordIds) { const data=storeFor(kind,recordId).load(); if(data!==null) result.push({kind:String(kind),recordId:String(recordId),data:clone(data)}); }
        return result;
      },
      async upsertRecord(record) {
        if(!record || !record.kind || !record.recordId || !record.idempotencyKey) throw new TypeError("kind, recordId and idempotencyKey are required.");
        const store=storeFor(record.kind,record.recordId), current=store.load();
        const currentVersion=current && Number(current.version)||0;
        if(current && current.lastIdempotencyKey===record.idempotencyKey) return {ok:true,replayed:true,record:clone(current)};
        if(record.expectedVersion!=null && Number(record.expectedVersion)!==currentVersion) return {ok:false,conflict:true,current:clone(current)};
        const next={kind:String(record.kind),recordId:String(record.recordId),version:currentVersion+1,
          updatedAt:new Date().toISOString(),lastIdempotencyKey:String(record.idempotencyKey),data:clone(record.data)};
        const saved=store.save(next);
        if(!saved || saved.persisted!==true) throw new Error("Local record could not be persisted.");
        return {ok:true,replayed:false,record:next};
      }
    });
  }
  function assertFutureCloudAdapter(adapter) {
    const checked=assertRecordAdapter(adapter,"future-cloud-contract-only");
    return Object.freeze({valid:true,active:false,assurance:checked.assurance,
      methods:checked.methods,requiresServerDerivedTenant:true,
      requiresIdempotencyKey:true,requiresExpectedVersion:true,
      conflictResponse:"{ok:false, conflict:true, current: record}",
      note:"Contract validation only. Do not configure or activate cloud sync in M5."});
  }

  const api=Object.freeze({buildLearningReport,toCsv,createLocalLearningRecordsReader,createLearningRecordsService,
    createRoleExperiencePolicy,assertRecordAdapter,createLocalRecordAdapter,assertFutureCloudAdapter,
    ADAPTER_METHODS,ROLE_KEYS});
  globalThis.ExamGuruM5Integration=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})();