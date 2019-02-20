const Scholarship = artifacts.require("Scholarship");
const truffleAssert = require('truffle-assertions');
const TT = require("../test_helpers/timeTravel");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// it("should", async () => {
// });

contract("Scholarship", accounts => {

  describe("#constructor", () => {
    // Setup
    let scholarship;
    before(async () => {
      scholarship = await Scholarship.new(10, "test instructions", "test school", "test course", { from: accounts[1] });
    })
    // Tests
    it("should be sponsored by transaction author", async () => {
      assert.equal(await scholarship.sponsor(), accounts[1]);
    });
    it("should not have a recipient", async () => {
      assert.equal(await scholarship.recipient(), ZERO_ADDRESS);
    });
    it("should appropriately assign constructor arguments", async () => {
      assert.equal(await scholarship.daysToComplete(), 10);
      assert.equal(await scholarship.instructions(), "test instructions");
      assert.equal(await scholarship.schoolName(), "test school");
      assert.equal(await scholarship.courseName(), "test course");
    });
    it("should not have any applicants", async () => {
      assert.equal((await scholarship.getApplicants()).length, 0);
    });
  })

  describe("#applyTo", () => {
    // Setup
    let scholarship;
    before(async () => {
      scholarship = await Scholarship.new(10, "_", "_", "_", { from: accounts[1] });
      await scholarship.applyTo("test link 2", { from: accounts[2] });
      await scholarship.applyTo("test link 3", { from: accounts[3] });
    });
    // Tests
    it("should add the application link to the mapping", async () => {
      assert.equal(await scholarship.applications(accounts[2]), "test link 2");
      assert.equal(await scholarship.applications(accounts[3]), "test link 3");
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
      scholarship = await Scholarship.new(10, "_", "_", "_", { from: accounts[1] });
      await scholarship.applyTo("test link 2", { from: accounts[2] });
      await scholarship.applyTo("test link 3", { from: accounts[3] });
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
  });

  describe("#getApplicants", () => {
    // Setup
    let scholarship;
    before(async () => {
      scholarship = await Scholarship.new(10, "_", "_", "_", { from: accounts[1] });
      await scholarship.applyTo("test link 2", { from: accounts[2] });
      await scholarship.applyTo("test link 3", { from: accounts[3] });
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
    let startingSponsorBalance;
    before(async () => {
      expiredScholarship = await Scholarship.new(9, "_", "_", "_", { from: accounts[1], value: web3.toWei(10, 'ether') });
      validScholarship = await Scholarship.new(10, "_", "_", "_", { from: accounts[1], value: web3.toWei(10, 'ether') });
      await expiredScholarship.applyTo("test link", { from: accounts[2] });
      await validScholarship.applyTo("test link", { from: accounts[2] });
      await expiredScholarship.awardTo(accounts[2], { from: accounts[1] });
      await validScholarship.awardTo(accounts[2], { from: accounts[1] });
      TT.fastForward(10, "days");
    });
    it("should forbid reclaiming from accounts other than sponsor", async () => {
      await truffleAssert.reverts(expiredScholarship.reclaim({ from: accounts[2] }));
      assert.equal(startingSponsorBalance)
    });
    it("should permit reclaiming an expired scholarship", async () => {
      await expiredScholarship.reclaim({ from: accounts[1] });
    });
    it("should forbid reclaiming a valid scholarship", async () => {
      await truffleAssert.reverts(validScholarship.reclaim({ from: accounts[1] }));
    });
    // it("should", async () => {
    // });
  });




});
