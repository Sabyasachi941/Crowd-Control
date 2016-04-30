package cc;

/**
 * Created by harryquigley on 30/03/2016.
 */

import cc.Venue;
import cc.VenueService;
import java.util.Map;

import org.joda.time.LocalDate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.ui.Model;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@Controller
public class VenueController {

    private VenueService venueService;

    @Autowired
    public void setVenueService(VenueService venueService) {
        this.venueService = venueService;
    }

    @Autowired
    private DayTotalPeopleRepository dayTotalPeopleRepository;


    //@Scheduled(cron = "* * * * * *")
    //current time creates new date for the first venue before midnight so it has the wrong date but venues after are correct??
    @Scheduled(cron = "0 0 0 * * *")
    public void printSomething(){
        Iterable<Venue> venues = venueService.listAllVenues();

        for(Venue v: venues) {
            LocalDate d = new LocalDate();
            dayTotalPeopleRepository.save(new DayTotalPeople(d,0,v));
        }

    }

    @RequestMapping(value="/venues", method = RequestMethod.GET)
    public String list(Model model){
        model.addAttribute("venues", venueService.listAllVenues());
        return "venues";
    }

    /*@RequestMapping(value="/venues", method = RequestMethod.POST)
    public String list(Model model){
        return "venues";
    }*/




    @RequestMapping("venue/{id}")
    public String showVenue(@PathVariable Integer id, Model model){
        model.addAttribute("venue", venueService.getVenueById(id));
        return "venueshow";
    }

    @RequestMapping("venue/edit/{id}")
    public String edit(@PathVariable Integer id, Model model){
        model.addAttribute("venue", venueService.getVenueById(id));
        return "venueform";
    }

    @RequestMapping("venue/new")
    public String newVenue(Model model){
        model.addAttribute("venue", new Venue());
        return "venueform";
    }

    @RequestMapping(value = "venue", method = RequestMethod.POST)
    public String saveVenue(Venue venue){
        venueService.saveVenue(venue);
        return "redirect:/venue/" + venue.getId();
    }

    @RequestMapping("venue/delete/{id}")
    public String delete(@PathVariable Integer id){
        venueService.deleteVenue(id);
        return "redirect:/venues";
    }

}
