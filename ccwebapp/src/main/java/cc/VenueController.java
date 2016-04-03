package cc;

/**
 * Created by harryquigley on 30/03/2016.
 */

import cc.Venue;
import cc.VenueService;
import java.util.Map;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.ui.Model;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class VenueController {

    private VenueService venueService;

    @Autowired
    public void setVenueService(VenueService venueService) {
        this.venueService = venueService;
    }

    @RequestMapping(value="/venues", method = RequestMethod.GET)
    public String list(Model model){
        model.addAttribute("venues", venueService.listAllVenues());
        return "venues";
    }

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