# LinkedIn draft

A first-person post for Arup. Edit freely; it's a starting point.

---

Most carbon apps are guilt machines. You log what you already burned, feel bad, and never open the app again.

I built Disha to do the opposite. It works *before* you spend.

You type one sentence "Kolkata to Bangalore for a 3-day work trip" or just share a screenshot of the flight you were about to book. Disha ranks your real options across carbon, cost, and time. For that trip, the train saves about 436 kg of CO₂, costs less, and you can work the whole way. The greener choice happens to be the cheaper one, which is exactly why people actually take it.

The part I care about most: the AI never makes up a number. Gemini reads your sentence into structured options, and a separate, unit-tested engine computes the carbon from verified Indian factors (CEA grid, India GHG rail). If the model ever produced the carbon figure, that would be a bug.

And it's honest about India specifically. An EV here saves less than the marketing claims, because the grid is roughly 0.72 kg CO₂ per kWh two to three times dirtier than the EU. Disha says that out loud instead of selling "zero emissions."

Built on Gemini + Google Cloud (Vertex AI, Firestore, Cloud Run) for the Carbon Footprint Awareness challenge.

Repo: https://github.com/ArupKantiDas/disha

#Gemini #GoogleCloud #Sustainability #ClimateTech #BuildInPublic
