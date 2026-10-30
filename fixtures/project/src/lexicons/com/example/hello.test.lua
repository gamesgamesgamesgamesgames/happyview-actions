local test = require("internal.test")

describe("com.example.hello", function()
  it("greets the name it is given", function()
    local res = test.query("com.example.hello", { name = "ci" })
    assert.are.equal(200, res.status)
    assert.are.equal("Hello, ci!", res.body.message)
  end)
end)
