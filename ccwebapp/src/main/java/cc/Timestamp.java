package cc;

import org.joda.time.DateTime;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.GenerationType;
import javax.persistence.JoinColumn;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.*;


@Entity
//FindbyinDay needs better name seeing as i'm actually calculating total people for the day
@NamedQuery(name="Timestamp.findByInDay", query= "select SUM(t.peopleIn) from Timestamp t where t.venue =?1 AND t.timestamp BETWEEN ?2 AND ?3")
public class Timestamp {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    private DateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "venue_id")
    private Venue venue;

    private Integer peopleIn;

    private Integer peopleOut;

    public Timestamp() {}

    public Timestamp(DateTime timestamp, Integer peopleIn, Integer peopleOut, Venue venue) {
        this.timestamp = timestamp;
        this.peopleIn = peopleIn;
        this.peopleOut = peopleOut;
        this.venue = venue;
    }


    //change the data type for timestamp to match up with postgres type/joda time idk
    public DateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(DateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Venue getVenue() {return venue;}

    public void setVenue(Venue venue) {this.venue = venue;}

    public Integer getPeopleIn() {return peopleIn;}

    public void setPeopleIn(Integer peopleIn) {this.peopleIn = peopleIn;}

    public Integer getPeopleOut() {return peopleOut;}

    public void setPeopleOut(Integer peopleOut) {this.peopleOut = peopleOut;}

}
