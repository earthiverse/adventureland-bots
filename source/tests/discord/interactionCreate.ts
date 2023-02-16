import { CommandInteraction, Client, Interaction, AutocompleteInteraction } from "discord.js"
import { Commands } from "./commands.js"

export default (client: Client): void => {
    client.on("interactionCreate", async (interaction: Interaction) => {
        if (interaction.isCommand() || interaction.isContextMenuCommand()) {
            await handleSlashCommand(client, interaction)
        }
        if (interaction.isAutocomplete()) {
            await handleAutoComplete(client, interaction)
        }
    })
}

const handleSlashCommand = async (client: Client, interaction: CommandInteraction): Promise<void> => {
    const slashCommand = Commands.find(c => c.name === interaction.commandName)
    if (!slashCommand) {
        interaction.followUp({ content: "An error has occurred" })
        return
    }

    await interaction.deferReply()

    slashCommand.run(client, interaction)
}

const handleAutoComplete = async (client: Client, interaction: AutocompleteInteraction): Promise<void> => {
    const command = Commands.find(c => c.name === interaction.commandName)
    if (!command) {
        return
    }

    // TODO: How do I type this for autocomplete?
    (command as any).autocomplete(client, interaction)
}