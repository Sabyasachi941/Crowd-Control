package cc;

import org.joda.time.DateTime;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.GenerationType;
import javax.persistence.JoinColumn;

@Entity
public class Timestamp {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    private DateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "venue_id")
    private Venue venue;

    public Timestamp() {}

    public Timestamp(DateTime timestamp) {
        this.timestamp = timestamp;
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
}
