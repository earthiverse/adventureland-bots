library("hrbrthemes")
library("jsonlite")
library("reshape2")
library("showtext")
library("stringr")
library("tidyverse")
library("viridis")

# set font
font_add("Arial Narrow", regular = "ARIALN.TTF", bold = "ARIALNB.TTF", italic = "ARIALNI.TTF")

# set directory
setwd("C:\\Users\\Hyprk\\Desktop\\stats")
files <- list.files()

# combine files to data sets
all_data <- data.frame(script=character(),
                       totalKills=integer())
for(file in files) {
  is_data_file <- str_extract(file, "(.+?)[:digit:]+.json")
  if(is.na(is_data_file)) { next } # Skip non-data files

  new_data <- read_json(file, simplifyVector = TRUE)

  # add data
  to_add_data <- data.frame(script=new_data$script,
                            totalKills=new_data$totalKills)
  all_data <- rbind(all_data, setNames(to_add_data, names(all_data)))
}

my_order <- c('default', 'can_kill', 'energize', 'cburst', '5shot')

# make box plots
showtext_auto()
all_data %>%
  ggplot( aes(x=factor(script, level = my_order), y=totalKills, fill=script)) +
    geom_boxplot(aes(color = script),
                 show.legend = FALSE) +
    geom_boxplot(aes(color = script),
                 fatten = NULL,
                 fill = NA,
                 coef = 0,
                 show.legend = FALSE) +
    scale_fill_viridis(discrete = TRUE, alpha=0.6) +
    geom_jitter(color="black", size=0.2, alpha=0.5) +
    theme_ipsum() +
    theme(
      legend.position="none"
    ) +
    ggtitle("Script Performance (# Kills / 10 Minutes)") +
    labs(x = "Script Name",
         y = "Kills",
         title = "Script Performance",
         subtitle = "Number of kills for all characters in 10 minutes")
ggsave("statistics.png", width = 1920, height = 1080, units = "px")
showtext_auto(FALSE)