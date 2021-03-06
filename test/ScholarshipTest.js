const Scholarship = artifacts.require("Scholarship");
const truffleAssert = require('truffle-assertions');
const ganache = require("../test_helpers/ganache");
const { localOraclizeResolverAddress, zeroAddress } = require("../config/Constants.js")

contract("Scholarship", accounts => {

  describe("#constructor", () => {
    // Setup
    let scholarship;
    before(async () => {
      scholarship = await Scholarship.new(10, "test school", "test course", localOraclizeResolverAddress, { from: accounts[1] });
    })
    // Tests
    it("should be sponsored by transaction author", async () => {
      assert.equal(await scholarship.sponsor(), accounts[1]);
    });
    it("should not have a recipient", async () => {
      assert.equal(await scholarship.recipient(), zeroAddress);
    });
    it("should appropriately assign constructor arguments", async () => {
      assert.equal(await scholarship.daysToComplete(), 10);
      assert.equal(await scholarship.schoolName(), "test school");
      assert.equal(await scholarship.courseName(), "test course");
    });
    it("should not have any applicants", async () => {
      assert.equal((await scholarship.getApplicants()).length, 0);
    });
    it("should not have a verification key set", async () => {
      assert.equal(await scholarship.verificationKey(), "");
    });
    it("should not have a student set", async () => {
      assert.equal(await scholarship.studentName(), "");
    });
  })

  describe("#applyTo", () => {
    // Setup
    let scholarship;
    before(async () => {
      scholarship = await Scholarship.new(10, "_", "_", localOraclizeResolverAddress, { from: accounts[1] });
      await scholarship.applyTo("name 2", "link 2", { from: accounts[2] });
      await scholarship.applyTo("name 3", "link 3", { from: accounts[3] });
    });
    // Tests
    it("should add the application to the mapping", async () => {
      let [ name2, link2 ] = await scholarship.applications(accounts[2])
      let [ name3, link3 ] = await scholarship.applications(accounts[3])
      assert.equal(name2, "name 2");
      assert.equal(link2, "link 2");
      assert.equal(name3, "name 3");
      assert.equal(link3, "link 3");
    });
    it("should add the applicant to the list of applicants", async () => {
      assert.equal((await scholarship.getApplicants()).length, 2);
      assert.equal(await scholarship.applicants(0), accounts[2]);
      assert.equal(await scholarship.applicants(1), accounts[3]);
    });
  });

  describe("#awardTo", () => {
    // Setup
    let scholarship;
    before(async () => {
      scholarship = await Scholarship.new(10, "_", "_", localOraclizeResolverAddress, { from: accounts[1] });
      await scholarship.applyTo("name 2", "link 2", { from: accounts[2] });
      await scholarship.applyTo("name 3", "link 3", { from: accounts[3] });
      await scholarship.awardTo(accounts[2], { from: accounts[1] });
    });
    // Tests
    it("should forbid awarding by anyone other than the sponsor", async () => {
      await truffleAssert.reverts(scholarship.awardTo(accounts[3], { from: accounts[2] }));
    });
    it("should mark recipient", async () => {
      assert.equal(await scholarship.recipient(), accounts[2]);
    });
    it("should forbid changing recipients", async () => {
      await truffleAssert.reverts(scholarship.awardTo(accounts[3], { from: accounts[1] }));
      assert.equal(await scholarship.recipient(), accounts[2]);
    });
    it("should empty the list of applicants", async () => {
      const applications = await scholarship.getApplicants();
      assert.equal(applications.length, 0);
    });
    it("should have a studentName", async () => {
      assert.equal(await scholarship.studentName(), "name 2");
    });
  });

  describe("#getApplicants", () => {
    // Setup
    let scholarship;
    before(async () => {
      scholarship = await Scholarship.new(10, "_", "_", localOraclizeResolverAddress, { from: accounts[1] });
      await scholarship.applyTo("name 2", "link 2", { from: accounts[2] });
      await scholarship.applyTo("name 3", "link 3", { from: accounts[3] });
    });
    // Tests
    it("should return a list of active applications", async () => {
      const applications = await scholarship.getApplicants();
      assert.equal(applications.length, 2);
      assert(applications.includes(accounts[2]));
      assert(applications.includes(accounts[3]));
    });
  });

  describe("#reclaim", () => {
    // Setup
    let expiredScholarship;
    let validScholarship;
    let startingSponsor1Balance;
    before(async () => {
      expiredScholarship = await Scholarship.new(9, "_", "_", localOraclizeResolverAddress, { from: accounts[1], value: web3.toWei(1, 'ether') });
      validScholarship = await Scholarship.new(10, "_", "_", localOraclizeResolverAddress, { from: accounts[2], value: web3.toWei(1, 'ether') });
      await expiredScholarship.applyTo("name", "link", { from: accounts[3] });
      await validScholarship.applyTo("name", "link", { from: accounts[3] });
      await expiredScholarship.awardTo(accounts[3], { from: accounts[1] });
      await validScholarship.awardTo(accounts[3], { from: accounts[2] });
      startingSponsor1Balance = web3.eth.getBalance(accounts[1]).toNumber();
      ganache.fastForward(10, "days");
    });
    // Tests
    it("should forbid reclaiming from accounts other than sponsor", async () => {
      await truffleAssert.reverts(expiredScholarship.reclaim({ from: accounts[3] }));
      assert.equal(startingSponsor1Balance, web3.eth.getBalance(accounts[1]).toNumber());
    });
    it("should permit reclaiming an expired scholarship", async () => {
      await expiredScholarship.reclaim({ from: accounts[1] });
      assert(startingSponsor1Balance < web3.eth.getBalance(accounts[1]).toNumber());
      assert(startingSponsor1Balance + web3.toWei(1, 'ether') > web3.eth.getBalance(accounts[1]).toNumber());
    });
    it("should forbid reclaiming a valid scholarship", async () => {
      await truffleAssert.reverts(validScholarship.reclaim({ from: accounts[2] }));
    });
  });

});
