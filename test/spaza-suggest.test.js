const assert = require("assert");
const spazaSuggest = require("../spaza-suggest");
const pgp = require("pg-promise")();

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:pg123@localhost:5432/spaza_suggest";

const config = {
  connectionString: DATABASE_URL,
};

const db = pgp(config);



describe ("The smart spaza", async function() {

    beforeEach(async function() {
        
        await db.none(`delete from accepted_suggestion`);
        await db.none(`delete from suggestion`);
        await db.none(`delete from spaza`);
        await db.none(`delete from spaza_client`);
        
    });

    it("should be able to list areas", async function() {
        const spaza = await spazaSuggest(db)
        const areas = await spaza.areas();
        assert.equal(5, areas.length);
        assert.equal('Khayelitsa - Site C', areas[2].area_name);

    });

    it("should be able to create a Spaza User and return a code", async function() {
       
      const spaza = await spazaSuggest(db)
      const code = await spaza.registerClient('spazani');
        assert.ok(code);
    });

    it("should be able to find  a user using a code", async function() {
      const spaza = await spazaSuggest(db)
        const code = await spaza.registerClient('spazani');
        const client = await spaza.clientLogin(code);
        assert.equal('spazani', client.username);
    });

    it("should be able to suggest a product for an area", async function() {

      const spaza = await spazaSuggest(db)
        const code = await spaza.registerClient('spazani');
        const client = await spaza.clientLogin(code);

        const areas = await spaza.areas();
        const area = areas[2];

        await spaza.suggestProduct(area.id, client.id, 'Small Pizzas');

        const suggestions = await spaza.suggestionsForArea(area.id);

        assert.equal('Small Pizzas', suggestions[0].product_name)

    });

    it("should be able to get all the suggestions for an area", async function() {

      const spaza = await spazaSuggest(db)
        const code = await spaza.registerClient('spazani');
        const client = await spaza.clientLogin(code);

        const area1 = await spaza.findAreaByName('Nyanga');
        const area2 = await spaza.findAreaByName('Nyanga East');

        await spaza.suggestProduct(area1.id, client.id, 'Small Pizzas');
        await spaza.suggestProduct(area2.id, client.id, 'Small Pizzas');
        await spaza.suggestProduct(area1.id, client.id, 'Baked Beans');

        const suggestions = await spaza.suggestionsForArea(area1.id);

        assert.equal(2, suggestions.length);
        assert.equal('Small Pizzas', suggestions[0].product_name);
        assert.equal('Baked Beans', suggestions[1].product_name);

    });


    // it("should be able to get all the suggestions made by a client", async function() {

    //   const spaza = await spazaSuggest(db)
    //     const code = await spaza.registerClient('spazani');
    //     const client = await spaza.clientLogin(code);

    //     const area1 = await spaza.findAreaByName('Nyanga');
    //     const area2 = await spaza.findAreaByName('Nyanga East');

    //     await spaza.suggestProduct(area1.id, client.id, 'Small Pizzas');
    //     await spaza.suggestProduct(area2.id, client.id, 'Small Pizzas');
    //     await spaza.suggestProduct(area1.id, client.id, 'Baked Beans');

    //     const suggestions = await spaza.suggestions(client.id);

    //     assert.equal(3, suggestions.length);
    //     assert.equal('Nyanga', suggestions[1].area_name);

    // });

    it("should be able to create a new Spaza shop", async function(){
      const spaza = await spazaSuggest(db)
        const area = await spaza.findAreaByName('Nyanga');
        const code = await spaza.registerSpaza('Spaza 101', area.id);
        assert.ok(code);
    });

    it("should be able to find a spaza shop using a code", async function(){

      const spaza = await spazaSuggest(db)
        const area = await spaza.findAreaByName('Nyanga')
        const code = await spaza.registerSpaza('Spaza 101', area.id);
        const spazas = await spaza.spazaLogin(code);
        assert.equal('Spaza 101', spazas.shop_name);
    });

    it("should be able to accept a suggestion", async function(){

      const spaza = await spazaSuggest(db)
        const code = await spaza.registerClient('spazani');
        const client = await spaza.clientLogin(code);

        const area1 = await spaza.findAreaByName('Nyanga');
        const area2 = await spaza.findAreaByName('Nyanga East');

        await spaza.suggestProduct(area1.id, client.id, 'Small Pizzas');
        await spaza.suggestProduct(area2.id, client.id, 'Small Pizzas');
        await spaza.suggestProduct(area1.id, client.id, 'Baked Beans');

        const spazaCode = await spaza.registerSpaza('Spaza 101', area1.id);
        const spazas = await spaza.spazaLogin(spazaCode);
        assert.equal('Spaza 101', spazas.shop_name);

        const suggestions = await spaza.suggestionsForArea(area1.id);

        await spaza.acceptSuggestion(suggestions[0].id, spazas.id);
        await spaza.acceptSuggestion(suggestions[0].id, spazas.id);
        
        const acceptedBySpaza = await spaza.acceptedSuggestions(spazas.id);

        assert.equal(1, acceptedBySpaza.length);

        assert.equal('Small Pizzas', acceptedBySpaza[0].product_name);

    });

    after(function () {
        db.$pool.end()
    });
   
});